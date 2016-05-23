/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Marc Duez <marc.duez@vidjil.org>
 *     The Vidjil Team <contact@vidjil.org>
 *
 * "Vidjil" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "Vidjil" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Clone object, store clone information and provide useful access function
 * @constructor Clone
 * @param {object} data - json style object, come directly from .vidjil file
 * @param {Model} model
 * @param {integer} index - clone index, it's just the clone position in the model's clone array
 * */
function Clone(data, model, index, virtual) {
    this.m = model
    this.index = index
    this.split = false
    this.seg = {};
    this.segEdited = false
    this.virtual = typeof virtual !== 'undefined' ? virtual : false
    var key = Object.keys(data)
    
    for (var i=0; i<key.length; i++ ){
        this[key[i]]=data[key[i]]
    }
    
    if (typeof (this.getSequence()) != 'undefined' && typeof (this.name) != 'undefined') {
        this.shortName = this.name.replace(new RegExp('IGHV', 'g'), "VH");
        this.shortName = this.shortName.replace(new RegExp('IGHD', 'g'), "DH");
        this.shortName = this.shortName.replace(new RegExp('IGHJ', 'g'), "JH");
        this.shortName = this.shortName.replace(new RegExp('TRG', 'g'), "");
        this.shortName = this.shortName.replace(new RegExp('\\*..', 'g'), "");
    }
    
    this.m.clusters[index]=[index]
    this.m.clones[index]=this
    this.tag = this.getTag();
    this.computeGCContent()
    this.computeCoverage()
    this.computeEValue()
}

function nullIfZero(x) { return x == 0 ? '' : x }

Clone.prototype = {

    COVERAGE_WARN: 0.5,
    EVALUE_WARN: 0.001,
    
    isWarned: function () {
    /**
     * @return {bool} a warning is set on this clone
     */
        if (this.coverage < this.COVERAGE_WARN) return true;
        if (typeof(this.eValue) != undefined && this.eValue > this.EVALUE_WARN) return true;
        return false;
    },

    /**
     * return clone's most important name, shortened
     * @return {string} name
     * */

    REGEX_N: /^(-?\d*)\/([ACGT]*)\/(-?\d*)$/,                                    // 6/ACCAT/
    REGEX_N_SIZE: /^(-?\d*)\/(\d*)\/(-?\d*)$/,                                   // 6/5/
    REGEX_GENE: /(IGH|IGK|IGL|TRA|TRB|TRG|TRD)([\w-*]*)$/,                       // IGHV3-11*03
    REGEX_GENE_IGNORE_ALLELE: /(IGH|IGK|IGL|TRA|TRB|TRG|TRD)([\w-]*)[\w-*]*$/,   // IGHV3-11*03  (ignore *03)

    getAverageReadLength: function(time) {
        if (this._average_read_length == 'undefined')
            return 'undefined';
        time = this.m.getTime(time);
        var size = this._average_read_length[time];
        if (size == 0)
            return 'undefined';
        return size;
    },

    getShortName: function () {

        name_items = this.getName().split(' ')
        short_name_items = []

        last_locus = ''

        for (var i = 0; i < name_items.length; i++) {

            s = name_items[i]

            // Shorten IGHV3-11*03 ... IGHD6-13*01 ... IGHJ4*02 into IGHV3-11*03 ... D6-13*01 ... J4*02
            // z = s.match(this.REGEX_GENE);
            z = s.match(this.REGEX_GENE_IGNORE_ALLELE);
            if (z)
            {
                locus = (z[1] == last_locus) ? '' : z[1]
                short_name_items.push(locus + z[2])
                last_locus = z[1]
                continue
            }

            // Shorten -6/ACCAT/ into 6/5/0
            z = s.match(this.REGEX_N);
            if (z)
            {
                short_name_items.push(Math.abs(z[1]) + '/' + nullIfZero(z[2].length) + '/' + Math.abs(z[3]))
                continue
            }

            // Shorten -6/0/ into 6//0
            z = s.match(this.REGEX_N_SIZE);
            if (z)
            {
                short_name_items.push(Math.abs(z[1]) + '/' + nullIfZero(z[2]) + '/' + Math.abs(z[3]))
                continue
            }

            short_name_items.push(s)
        }

        return short_name_items.join(' ')
    },

    /**
     * Get the amino-acid sequence of the provided field (in the seg part)
     */
    getSegAASequence: function(field_name) {
        if (typeof this.seg != 'undefined'
            && typeof this.seg[field_name] != 'undefined'
            && typeof this.seg[field_name].aa != 'undefined') {
            return this.seg[field_name].aa;
        }
        return '';
    },

    /**
     * Get the nucleotide sequence  (extracted from the start and stop fields)
     */
    getSegNtSequence: function(field_name) {
        positions = this.getSegStartStop(field_name)
        if (positions != null) {
            return this.sequence.substr(positions['start']-1, positions['stop'] - positions['start']+1)
        }
        return '';
    },

    /**
     * Return the length of the given field_name in seg
     * (difference between the stop and the start).
     * If no start and stop are given, return 0
     */
    getSegLength: function(field_name) {
        positions = this.getSegStartStop(field_name)
        if (positions != null) {
            return positions['stop'] - positions['start'] + 1
        } else {
            return 'undefined';
        }
    },

    /**
     * Get the start and stop position of a given field (e.g. cdr3)
     * If it does not exist return null
     */
    getSegStartStop: function(field_name) {
        if (typeof this.seg != 'undefined'
            && typeof this.seg[field_name] != 'undefined'
            && typeof this.seg[field_name].start != 'undefined'
            && typeof this.seg[field_name].stop != 'undefined') {
            return {'start': this.seg[field_name].start,
                    'stop': this.seg[field_name].stop}
        }
        return null;
    },

    /** 
     * return clone's most important name <br>
     * cluster name > custom_name > segmentation name > window
     * @return {string} name
     * */
    getName: function () {
        if (this.m.clusters[this.index].name){
            return this.m.clusters[this.index].name;
        }else if (this.c_name) {
            return this.c_name;
        } else if (this.name) {
            return this.name;
        } else {
            return this.getSequenceName();
        }
    }, 
    
    /**
     * return custom name <br>
     * or segmentation name
     * @return {string} name
     * */
    getSequenceName: function () {
        if (typeof (this.c_name) != 'undefined') {
            return this.c_name;
        } else {
            return this.getCode();
        }
    }, //end getName

    /**
     * return segmentation name "geneV -x/y/-z geneJ", <br>
     * return a short segmentation name if default segmentation name is too long
     * @return {string} segmentation name
     * */
    getCode: function () {
        if (typeof (this.sequence) != 'undefined' && typeof (this.name) != 'undefined' && this.name != "") {
            if (this.length > 100 && typeof (this.shortName) != 'undefined') {
                return this.shortName;
            } else {
                return this.name;
            }
        } else {
            return this.id;
        }
    }, //end getCode

    /**
     * change/add custom name
     * @param {string} name
     * */
    changeName: function (newName) {
        console.log("changeName() (clone " + this.index + " <<" + newName + ")");
        this.c_name = newName;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true
    }, //fin changeName,

    
    
    
    


    /**
     * compute the clone size ( ratio of all clones clustered ) at a given time
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSize: function (time) {
        time = this.m.getTime(time);
        
        if (this.m.reads.segmented[time] == 0 ) return 0;
        var result = this.getReads(time) / this.m.reads.segmented[time];
        
        if (this.m.norm) result = this.m.normalize(result, time);

        return result;
    }, //end getSize
    
    /**
     * compute the clone size (ratio of all clones clustered) at a given time <br>
     * return 'undefined' in case of empty clone <br>
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSizeZero: function (time) {
        time = this.m.getTime(time);
        
        result = this.getSize(time);
        if (result == 0) return undefined;
        return result;
    }, 
    
    /**
     * return the biggest size a clone can reach in the current samples
     * */
    getMaxSize: function () {
        var max=0;
        for (var i in this.m.samples.order){
            var tmp=this.getSize(this.m.samples.order[i]);
            if (tmp>max) max=tmp;
        }
        return max;
    },
    
    /**
     * special getSize for scatterplot (ignore constant normalization)<br>
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSize2: function (time) {
        time = this.m.getTime(time)
        
        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.getReads(time) / this.m.reads.segmented[time]
        
        if (this.m.norm && this.m.normalization.method!="constant") result = this.m.normalize(result, time)

        return result
    },

    /**
     * @return {string} the global size ratio of the clone at the given time
     */
    getStrSize: function(time) {
        return this.m.getStrAnySize(time, this.getSize(time));
    },
    
    /**
     * return the clone's system size ratio
     * use notation defined in model
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */
    getSystemSize: function (time) {
        time = this.m.getTime(time)
        
        var system_reads = this.m.reads.segmented[time]
        if (this.germline in this.m.reads.germline) system_reads = this.m.reads.germline[this.germline][time]
        
        if (system_reads == 0 ) return 0
        var result = this.getReads(time) / system_reads
        
        if (this.m.norm) result = this.m.normalize(result, time)

        return result
    },

    /**
     * Return the size ratios of the current clone at a given time.
     * Return the size globally, for the clone's system and for the clone's
     * system group.
     */
    getAllSystemSize: function(time) {
        return {global: this.getSize(time),
                system: this.getSystemSize(time),
                systemGroup: this.getSystemGroupSize(time)};
    },

    /**
     * return the clone's ratio sizes with a fixed number of character
     * use notation defined in model
     * @param {integer} time - tracking point (default value : current tracking point)
     * @param {boolean} extra_info - true iff we add information in the system strings
     * to the system they refer to.
     * @return {object} with three fields: global, system and systemGroup whose
     * values are sizes as formatted strings.
     * For systemGroup the value may be undefined if there is no system group.
     * */
    getStrAllSystemSize: function (time, extra_info) {
        extra_info = extra_info || false

        sizes = this.getAllSystemSize(time)

        if (sizes.systemGroup == 0
            || this.m.systemGroup(this.germline) == this.germline)
            systemGroupStr = undefined
        else
            systemGroupStr = this.m.getStrAnySize(time, sizes.systemGroup)
            + (extra_info ? ' of ' + this.m.systemGroup(this.germline) : '')

        systemStr = this.m.getStrAnySize(time, sizes.system)
        if (systemStr != "+")
            systemStr = this.m.getStrAnySize(time, sizes.system)
            + (extra_info ? ' of ' + this.germline : '')
        else
            systemStr = undefined

        return {global: this.m.getStrAnySize(time, sizes.global),
                system: systemStr,
                systemGroup: systemGroupStr}
    },

    /**
       Ratio relative to the system group (if it exists) */
    getSystemGroupSize: function (time) {
        var group_reads = this.m.systemGroupSize(this.germline, this.m.getTime(time))

        if (group_reads == 0 ) return 0 ;
        var result = this.getReads(time) / group_reads
        if (this.norm) result = this.normalize(result, time)
        return result

    },

    /* return a printable information: length, number of reads, and ratios
       The ratios may be '26.32%', or, when there are several (pseudo-)locus,
       '26.32%, 33.66% of IGH' or even '0.273%, 4.043% of IGK+/IGK, 4.060% of IGK+'

       --> "286 nt, 1418 reads (0.273%, 4.043% of IGK+/IGK, 4.060% of IGK+)"
    */

    getPrintableSize: function (time) {

        var reads = this.getReads(time)
        s = this.getSequenceLength() + ' nt, '

        s += this.m.toStringThousands(reads) + ' read' + (reads > 1 ? 's' : '') + ' '

        if (reads < this.m.NB_READS_THRESHOLD_QUANTIFIABLE)
            return s

        sizes = this.getStrAllSystemSize(time, true)

        s += '('
        s += sizes.global

        if (this.m.system_available.length>1) {
            if (sizes.systemGroup != undefined) // if the system group has more than one germline
            {
                s += ', '
                s += sizes.systemGroup
            }
            if (sizes.system != undefined) {
                s += ', '
                s += sizes.system
            }
        }

        s += ')'
        return s
    },

    getFasta: function() {
        fasta = ''
        fasta += '>' + this.getCode() + '    ' + this.getPrintableSize() + '\n'
        fasta += this.getPrintableSegSequence() + '\n'

        return fasta
    },

    /**
     * compute the clone size (**only the main sequence, without merging**) at a given time
     * @param {integer} time - tracking point (default value : current tracking point)
     * @return {float} size
     * */

    getSequenceSize: function (time) {
        time = this.m.getTime(time)
        
        if (this.m.reads.segmented[time] == 0 ) return 0
        var result = this.get('reads',time) / this.m.reads.segmented[time]
        
        if (this.norm) {
            result = this.m.normalize(result, time)
        }

        return result

    }, //end getSequenceSize

    getStrSequenceSize: function (time) {
        time = this.m.getTime(time)
        var size = this.getSequenceSize(time)
        var sizeQ = this.m.getSizeThresholdQ(time);
        return this.m.formatSize(size, true, sizeQ)
    },

    /* compute the clone reads number ( sum of all reads of clones clustered )
     * @t : tracking point (default value : current tracking point)
     * */
    getReads: function (time) {
        time = this.m.getTime(time)
        var result = 0;

        var cluster = this.m.clusters[this.index]
        for (var j = 0; j < cluster.length; j++) {
            result += this.m.clone(cluster[j]).reads[time];
        }

        return result

    }, //end getSize

    computeEValue: function () {
        var e = this.getGene('_evalue');
        if (typeof(e) != 'undefined')
            this.eValue = parseFloat(e)
        else
            this.eValue = undefined
    },

    getGene: function (type, withAllele) {
        withAllele = typeof withAllele !== 'undefined' ? withAllele : true;
        if (typeof (this.seg) != 'undefined' && typeof (this.seg[type]) != 'undefined' && typeof this.seg[type]["name"] != 'undefined') {
            if (withAllele) {
                return this.seg[type]["name"];
            }else{
                return this.seg[type]["name"].split('*')[0];
            }
        }
        switch (type) {
            case "5" :
                return "undefined V";
            case "4" :
                return "undefined D";
            case "3" :
                return "undefined J";
        }
        return undefined;
    },
    
    getNlength: function () {
        if (typeof this.seg != 'undefined' && typeof this.seg['3'] != 'undefined' && typeof this.seg['5'] != 'undefined'){
            return this.seg['3']['start']-this.seg['5']['stop']-1
        }else{
            return 'undefined'
        }
    },
    
    getSequence : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence != 0){
            return this.sequence.toUpperCase()
        }else{
            return "0";
        }
    },

    getRevCompSequence : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence != 0){
            var dict_comp  = {
          'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
          'Y': 'R', 'R': 'Y', // pyrimidine (CT) / purine (AG)
          'W': 'S', 'S': 'W', // weak (AT) / strong (GC)
          'K': 'M', 'M': 'K', // keto (TG) / amino (AC)
          'B': 'V', 'V': 'B', 'D': 'H', 'H': 'D',
          'N': 'N'
          }
            var revcompSeq = ""
            for (var i = this.sequence.length -1 ; i > -1; i--) { // test -1
                revcompSeq += dict_comp[this.sequence[i].toUpperCase()]
            }
            return revcompSeq
        }else{
            return "0";
        }
    },
    
    getPrintableSegSequence: function () {
        if (typeof this.seg == 'undefined' || typeof this.seg['5'] == 'undefined' || typeof this.seg['3'] == 'undefined') {
            return this.getSequence()
        }

        var s = ''
        s += this.sequence.substring(0,  this.seg['5']['stop'])
        s += '\n'
        if (this.seg['5']['stop'] < this.seg['3']['start'] - 1) {
            s += this.sequence.substring(this.seg['5']['stop'], this.seg['3']['start'] - 1)
            s += '\n'
        }
        s += this.sequence.substring(this.seg['3']['start'] - 1)
        return s
    },

    /*
     * Compute coverage as the average value of non-zero coverages
     */

    computeCoverage: function () {
        if (typeof (this._coverage) == 'undefined') {
            this.coverage = undefined
            return
        }

        var sum = 0.0
        var nb = 0

        for (var i=0; i<this._coverage.length; i++) {
            if (this._coverage[i] > 0) {
                sum += parseFloat(this._coverage[i])
                nb += 1
            }
        }
        this.coverage = sum/nb
    },

    computeGCContent: function () {
        if (typeof (this.sequence) == 'undefined') {
            this.GCContent = '?'
            return
        }

        var gc = 0
        for (var i in this.sequence) {
            if ("GgCc".indexOf(this.sequence[i]) > -1)
                gc++ }

        this.GCContent = gc / this.sequence.length
    },

    getSequenceLength : function () {
        if (typeof (this.sequence) != 'undefined' && this.sequence != 0){
            return this.sequence.length
        }else{
            return 0;
        }
    },    
    
    
    
    
    /* give a new custom tag to a clone
     *
     * */
    changeTag: function (newTag) {
        newTag = "" + newTag
        newTag = newTag.replace("tag", "");
        console.log("changeTag() (clone " + this.index + " <<" + newTag + ")");
        this.tag = newTag;
        this.m.updateElem([this.index]);
        this.m.analysisHasChanged = true;
    },
    
    getColor: function () {
        if (this.color) {
            return this.color;
        } else {
            "";
        }
    }, 
    
    getTag: function () {
        if (this.tag) {
            return this.tag;
        } else {
            return this.m.default_tag;
        }
    }, 
    
    getTagName: function () {
        return this.m.tag[this.getTag()].name
    }, 
    
    
    /* compute clone color
     *
     * */
    updateColor: function () {
        if (this.m.focus == this.index){
            this.color = "";
        }else if (this.m.colorMethod == "abundance") {
            var size = this.getSize()
            if (this.m.clusters[this.index].length==0){ size = this.getSequenceSize() }
            if (size == 0){
                this.color = "";
            }else{
                this.color = colorGenerator(this.m.scale_color(size * this.m.precision));
            }
        }else if (this.m.colorMethod == "Tag"){
            this.color =  this.m.tag[this.getTag()].color;
        }else if (this.m.colorMethod == "dbscan"){
            this.color =  this.colorDBSCAN;
        }else if (this.m.colorMethod == "V" && this.getGene("5") != "undefined V"){
            this.color = "";
            var allele = this.m.germlineV.allele[this.getGene("5")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "D" && this.getGene("4") != "undefined D"){
            this.color = "";
            var allele = this.m.germlineD.allele[this.getGene("4")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "J" && this.getGene("3") != "undefined J"){
            this.color = "";
            var allele = this.m.germlineJ.allele[this.getGene("3")]
            if (typeof allele != 'undefined' ) this.color = allele.color;
        }else if (this.m.colorMethod == "N"){
            this.color =  this.colorN;
        }else if (this.m.colorMethod == "system") {
            this.color = this.m.germlineList.getColor(this.germline)
        } else if (this.m.colorMethod == 'productive') {
            if (typeof this.seg != 'undefined'
                && typeof this.seg.junction != 'undefined'
                && typeof this.seg.junction.productive != 'undefined') {
                this.color = colorProductivity(this.seg.junction.productive)
            }
        }else{
            this.color = "";
        }
    },
    
    /**
     * Create a list of possibles locus to manually assign to a clone
     * @return {string} content - an HTML  code of form
     */    
    createLocusList: function () {
        var content = "<form name='germ'><select class='menu-selector' NAME='LocusForm' id='germSelector', onChange='m.clones["+ this.index +"].changeLocus(this.form.LocusForm.value);'  style='width: 80px' >";
        content += "<option value="+ this.germline + ">" + this.germline + "</option>";
        
        for (var i in germline_data) {
            if (i.indexOf("_") ==-1 ){
                content += "<option value=" + i +">" + i + "</option>";
            }
        }
        content += "</select></form>";
        return content;
    },
    
    /**
     * Apply a locus changment made by user to a clone
     * Change *Changed params to true and update the view with new param 
     * @param {string} formValue - the value of selection made by user
     */
    changeLocus: function(formValue) {
        if (typeof this.germline == 'undefined') {
            this.germline = "custom";
        }
        var oldGermline = this.germline;
        var newGermline = formValue;
        console.log("Changement of locus : "+oldGermline +" to "+ newGermline)
        this.germline = newGermline;

        // change reads segmented/germline values in model
        try {
            for (var i =0; i< this.m.reads.segmented.length; i++) {
                if(oldGermline != "custom") {this.m.reads.germline[oldGermline][i] -= this.reads[i]};
                if(newGermline != "custom") {this.m.reads.germline[newGermline][i] += this.reads[i]};
                if (newGermline == "custom" && newGermline != oldGermline) {
                    this.m.reads.segmented_all[i] -= this.reads[i]
                } else if (oldGermline == "custom" && newGermline != "custom"){
                    this.m.reads.segmented_all[i] += this.reads[i]
                }
            }
        }
        catch (e) {
            console.log("Erreur : unable to get 'this.m.reads.segmented'"); 
        }

        var segments  = ["Vsegment", "Dsegment", "Jsegment"];

        for (var i = 0; i < segments.length; i++) {
            if (document.getElementById('list'+segments[i])) {
                var myDiv = document.getElementById('list'+segments[i]);
                var content = this.createSegmentList(segments[i], formValue);
                myDiv.innerHTML = content;
            }
        };
        this.m.analysisHasChanged = true;
        this.segEdited = true;

        // if newGerline wasn't in system_available
        if (jQuery.inArray( newGermline, this.m.system_available ) == -1) {
            this.m.system_available.push(newGermline);
        }
        this.m.toggle_all_systems(true);
        this.m.update();
    },

    /**
     * Create a list of possibles segments to manually assign to a clone
     * @return {string} content - an HTML  code of form
     * @param {string} locus - the locus of the clone
     * @param {string} segment - the segment concerned( "Vsegment", "Dsegment" or "Jsegment")
     */
    createSegmentList: function (segment, locus) {
        var segments = {"Vsegment": ["5", "V"], "Dsegment": ["4", "D"], "Jsegment": ["3", "J"]};
        var nLocus = locus + segments[segment][1];
        var content = "<form name="+ segment  +"><select class='menu-selector' NAME="+segment+" onChange='m.clones["+ this.index +"].changeSegment(this.form." + segment + ".value, " + segments[segment][0] + ");'  style='width: 100px' >";
        content += "<option value="+ this.getGene(segments[segment][0]) + ">" + this.getGene(segments[segment][0]) + "</option>";        

        if( typeof(locus) == 'undefined' ){
            nLocus = this.germline + segments[segment][1];
        };
        for (var i in germline) {
            if (i.indexOf(nLocus) !=-1 ){
                for (seg in germline[i]) {
                    content += "<option value=" + seg +">" + seg + "</option>";
                };
            };
        };
        content += "</select></form>";
        return content;
    },
    
    /**
     * Apply a segment changment made by user to a clone
     * Change *Changed params to true and update the view with new param 
     * @param {string} formValue - the value of selection made by user
     * @param {string} segment - the segment who will be change( "5", "4" or "3")
     */
    changeSegment: function (formValue, segment) {
        // TODO add chgmt of germline in data analysis

        delete this.seg[segment];
        delete this.seg[segment+"start"]
        delete this.seg[segment+"end"]

        this.seg[segment] = {}
        this.seg[segment]["name"]  = formValue
        this.seg[segment]["start"] = 0
        this.seg[segment]["stop"]  = 0

        // TODO : insert real value for stats (start, end, evalue, ...)
        this.seg["_evalue"]       = 0
        this.seg["_evalue_left"]  = 0
        this.seg["_evalue_right"] = 0
        this.m.analysisHasChanged = true;
        this.segEdited = true;
        this.m.update();

    },
    
    /**
     * Use the .segEdited value to insert an icon in the html information
     */
    getHTMLModifState: function () {
        var content = ""
        if (this.segEdited) {
            // TODO find a better icon
            content += " <img src='images/icon_fav_on.png' alt='This clone has been edited by a user'>"
            
        };
        return content;
    },
    /**
     * Use to switch the display value of manual changment lists between "none" or "inline"
     */
    toggle: function() {
        var listDiv = ["#listLocus", "#listVsegment", "#listDsegment", "#listJsegment"]
        for (elt in listDiv) {
            $( listDiv[elt] ).toggle();
        };
    },
    
    /* return info about a sequence/clone in html 
     *
     * */
    getHtmlInfo: function () {
        var isCluster = this.m.clusters[this.index].length
        var time_length = this.m.samples.order.length
        var html = ""

        if (isCluster) {
            html = "<h2>Cluster info : " + this.getName() + "</h2>"
        } else {
            html = "<h2>Sequence info : " + this.getSequenceName() + "</h2>"
        }
        
        //column
        html += "<div id='info_window'><table><tr><th></th>"

        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.m.getStrTime(this.m.samples.order[i], "name") + "</td>"
        }
        html += "</tr>"

        //cluster info
        if (isCluster) {
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> clone </td></tr>"
            html += "<tr><td> clone name </td><td colspan='" + time_length + "'>" + this.getName() + "</td></tr>"
            html += "<tr><td> clone short name </td><td colspan='" + time_length + "'>" + this.getShortName() + "</td></tr>"
            html += "<tr><td> clone size (n-reads (total reads) )</td>"
            for (var i = 0; i < time_length; i++) {
                html += "<td>"
                html += this.getReads(this.m.samples.order[i]) + "  (" + this.m.reads.segmented[this.m.samples.order[i]] + ")"
                if ($('#debug_menu').is(':visible') && (typeof this.m.db_key.config != 'undefined' )) {
                html += "<br/>"
                call_reads = "db.call('default/run_request', { "
                call_reads += "'sequence_file_id': '" + this.m.samples.db_key[this.m.samples.order[i]] + "', "
                call_reads += "'config_id' : '" + this.m.db_key.config + "', "
                call_reads += "'grep_reads' : '" + this.id + "' })"
                console.log(call_reads)
                html += "<span class='button' onclick=\"" + call_reads + "\"> get reads </span>"
                }
                html += "</td>"
            }
            html += "</tr><tr><td> clone size (%)</td>"
            for (var i = 0; i < time_length; i++) {
                html += "<td>" + this.getStrSize(this.m.samples.order[i]) + "</td>"
            }
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> representative sequence</td></tr>"
        }else{
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> sequence</td></tr>"
        }

        
        //sequence info (or cluster main sequence info)
        html += "<tr><td> sequence name </td><td colspan='" + time_length + "'>" + this.getSequenceName() + "</td></tr>"
        html += "<tr><td> code </td><td colspan='" + time_length + "'>" + this.getCode() + "</td></tr>"
        html += "<tr><td> length </td><td colspan='" + time_length + "'>" + this.getSequenceLength() + "</td></tr>"

        //coverage info
        if (typeof this.coverage != 'undefined') {
            html += "<tr><td> average coverage </td><td colspan='" + time_length + "'><span "
            if (this.coverage < this.COVERAGE_WARN)
                html += "class='warning'"
            html += ">" + this.coverage.toFixed(3) + "</span></td>"
        }

        // e-value
        if (typeof this.eValue != 'undefined') {
            html += "<tr><td> e-value </td><td colspan='" + time_length + "'><span "
            if (this.eValue > this.EVALUE_WARN)
                html += "class='warning'"
            html += ">" + this.eValue + "</span></td>"
        }

        // abundance info
        html += "<tr><td> size (n-reads (total reads) )</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.get('reads',this.m.samples.order[i]) + 
                    "  (" + this.m.reads.segmented[this.m.samples.order[i]] + ")</td>"
        }
        html += "</tr>"
        html += "<tr><td> size (%)</td>"
        for (var i = 0; i < time_length; i++) {
            html += "<td>" + this.getStrSequenceSize(this.m.samples.order[i]) + "</td>"
        }
        html += "</tr>"

        
        //segmentation info
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> segmentation "
        html += " <button type='button' onclick='m.clones["+ this.index +"].toggle()'>edit</button> "; //Use to hide/display lists
        html += this.getHTMLModifState() // icon if manual changement 
        html += "</td></tr>"
        
        if (typeof this.stats != 'undefined'){
            var total_stat = [];
            for (var i=0; i<this.stats.length; i++) total_stat[i] = 0
            for (var i=0; i<this.stats.length; i++){
                for (var key in this.stats[i]) total_stat[i] +=  this.stats[i][key]
            }
            
            for (var key in this.stats[0]){
                html += "<tr><td> "+this.m.segmented_mesg[key]+"</td>"
                for (var i = 0; i < time_length; i++) {
                html += "<td>"+this.stats[i][key] 
                        + " (" + ((this.stats[i][key]/total_stat[i]) * 100).toFixed(1) + " %)</td>"
                }
            }
        }
        
        html += "<tr><td> sequence </td><td colspan='" + time_length + "'>" + this.sequence + "</td></tr>"
        html += "<tr><td> id </td><td colspan='" + time_length + "'>" + this.id + "</td></tr>"
        html += "<tr><td> locus </td><td colspan='" + time_length + "'>" + this.m.systemBox(this.germline).outerHTML + this.germline + "<div class='div-menu-selector' id='listLocus' style='display: none'>" + this.createLocusList() + "</div></td></tr>"
        html += "<tr><td> V gene (or 5') </td><td colspan='" + time_length + "'>" + this.getGene("5") + "<div class='div-menu-selector' id='listVsegment' style='display: none'>" + this.createSegmentList("Vsegment") + "</div></td></tr>"
        html += "<tr><td> (D gene) </td><td colspan='" + time_length + "'>" + this.getGene("4") +       "<div class='div-menu-selector' id='listDsegment' style='display: none'>" + this.createSegmentList("Dsegment") + "</div></td></tr>"
        html += "<tr><td> J gene (or 3') </td><td colspan='" + time_length + "'>" + this.getGene("3") + "<div class='div-menu-selector' id='listJsegment' style='display: none'>" + this.createSegmentList("Jsegment") + "</div></td></tr>"

        // Other seg info
        var exclude_seg_info = ['affectSigns', 'affectValues', '5', '4', '3']
        for (var key in this.seg) {
            if (exclude_seg_info.indexOf(key) == -1 && this.seg[key] instanceof Object) {
                var nt_seq = this.getSegNtSequence(key);
                if (nt_seq != '') {
                    html += "<tr><td> "+key+" </td><td colspan='" + time_length + "'>" + this.getSegNtSequence(key) + "</td></tr>"
                }
            }
        }
        if (typeof this.seg['junction'] != 'undefined'
           && this.seg.junction.productive == true) {
            html += "<tr><td> Junction (AA seq) </td><td colspan='" + time_length + "'>" + this.getSegAASequence('junction') + "</td></tr>"
        }

        
        //other info (clntab)
        html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> &nbsp; </td></tr>"
        for (var key in this) {
            if (key[0] == "_") {
                html += "<tr><td>" + key + "</td>"
                if (this[key] instanceof Array) {
                    for (var i = 0; i < time_length; i++) {
                        html += "<td>" + this[key][this.m.samples.order[i]] + "</td>"
                    }
                } else {
                    html += "<td>" + this[key] + "</td>"
                }
                html += "</tr>"
            }
        }
        
        //IMGT info
        if (this.seg.imgt != null) {
            html += "<tr><td class='header' colspan='" + (time_length + 1) + "'> Results of <a href='http://www.imgt.org/IMGT_vquest/share/textes/'>IMGT/V-QUEST</a> " + "</td></tr>";
            for (var item in this.seg.imgt) {
                    html += "<tr><td> " + item + "</td><td> " + this.seg.imgt[item] + "</td></tr>";
            }
        }

        html += "</table></div>"
        return html
    },

    toCSV: function () {
        var csv = this.getName() + "," + this.id + "," + this.get('germline') + "," + this.getTagName() + ","
                + this.getGene("5") + "," + this.getGene("4") + "," + this.getGene("3") + "," + this.getSequence()

        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getReads(this.m.samples.order[i])
        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getSize(this.m.samples.order[i])
        for (var i=0; i<this.m.samples.order.length; i++) csv += "," + this.getPrintableSize(this.m.samples.order[i]).replace(/,/g, ';')

        return csv
    },

    enable: function (top) {
        if (this.top > top || this.isVirtual())
            return ;

        if (this.m.tag[this.getTag()].display) {
            this.active = true;
        }
        else {
            this.m.someClonesFiltered = true
        }
    },

    disable: function () {
        this.active = false;
    },

    unselect: function () {
        console.log("unselect() (clone " + this.index + ")")
        if (this.select) {
            this.select = false;
            this.m.removeFromOrderedSelectedClones(this.index);
        }
        this.m.updateElemStyle([this.index]);
    },

    isSelected: function () {
        return this.select
    },

    /**
     * @return true iff the clone is not filtered
     */
    isActive: function () {
        return this.active
    },

    isVirtual: function () {
        return this.virtual
    },
    
    isFocus: function () {
        return this.index == this.m.focus
    },
    
    get: function (field_name, time) {
        if (typeof this[field_name] != 'undefined'){
            var field = this[field_name]
        }else if (typeof this.seg[field_name] != 'undefined'){
            var field = this.seg[field_name]
        }
        
        if (typeof field != 'object'){
            return field;
        }else{
            time = this.m.getTime(time)
            return field[time]
        }
    }
    
};












