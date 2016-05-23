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
 * GermlineList - store a raw list of germline unsorted and unfiltered
 * @class GermlineList
 * @constructor 
 * */
function GermlineList () {
    this.list = {}
    this.load()
}


GermlineList.prototype = {
    
    /**
    * retrieve the default germline list from server <br>
    * germline.js contain a copy of the germline list used if the server is unavailable
    * */
    load : function () {
        this.fallbackLoad() //just in case
        
        $.ajax({
            url: window.location.origin + "/germline/germlines.data",
            success: function (result) {
                try {
                    //remove comment (json don't have comment)
                    var json = result.replace(/ *\/\/[^\n]*\n */g , "")
                    //convert from js to json (json begin with { or [, never with a var name)
                    json = json.replace("germline_data = " , "")
                    self.list = jQuery.parseJSON(json);
                }
                catch(err){
                    console.log({"type": "flash", "msg": "germlines.data malformed, use local js file instead (can be outdated) " , "priority": 2});
                }
            },
            error: function (request, status, error) {
                console.log({"type": "flash", "msg": "impossible to retrieve germline.data, using local germline.js", "priority": 0});
            },
            dataType: "text"
        });
        
        
    },
    
    /**
    * retrieve the default germline list from germline.js <br>
    * germline.js should be rebuild from time to time to keep thegermlines up to date (if you want to use the browser in offline mode)
    * */
    fallbackLoad : function () {
        try {
            this.list = germline_data
        }
        catch(err){
            console.log({"type": "popup", "msg": "Incorrect browser installation, 'js/germline.js' is not found<br />please run 'make' in 'germline/'"});
        }
    },
    
    /**
    * add a list of germlines to the default germline list<br>
    * list {object[]} list 
    * */
    add : function (list) {
        for ( var key in list ) {
            this.list[key] = list[key];
        }
    },
    
    /**
     * return the color of a certain germline/system
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @return {string} color
     * */
    getColor: function (system) {
        if (typeof this.list[system] != 'undefined' && typeof this.list[system].color != 'undefined' ){
            return this.list[system].color
        }else{
            return "";
        }
    },
    
    /**
     * return the shortcut of a certain germline/system
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @return {string} shortcut
     * */
    getShortcut: function (system) {
        if (typeof this.list[system] != 'undefined' && typeof this.list[system].shortcut != 'undefined' ){
            return this.list[system].shortcut
        }else{
            return "x"
        }
    },
    
}


/** 
 * Germline object, contain the list of genes/alleles for a germline <br>
 * compute some information for each gene(rank/color) and order them <br>
 * use a model GermlineList object
 * @param {Model} model - 
 * @class Germline
 * @constructor 
 * */
function Germline (model) {
    this.m = model
    this.allele = {};
    this.gene = {};
    this.system = ""
}

Germline.prototype = {
    
    /**
     * load the list of gene <br>
     * reduce germline size (keep only detected genes in clones) <br>
     * and add undetected genes (missing from germline)
     * @param {string} system - system key ('IGH', 'TRG', ...)
     * @param {string} type - V,D or J
     * @param {function} callback
     * */
    load : function (system, type, callback) {
        var self = this;
        
        this.system = system
        name = name.toUpperCase()
        
        this.allele = {}
        this.gene = {}
        
        var type2
        if (type=="V") type2="5"
        if (type=="D") type2="4"
        if (type=="J") type2="3"
        
        if (typeof this.m.germlineList.list[system] != 'undefined'){
            
            if (typeof this.m.germlineList.list[system][type2] != 'undefined' ){
                for (var i=0; i<this.m.germlineList.list[system][type2].length; i++){
                    var filename = this.m.germlineList.list[system][type2][i] 
                    filename = filename.split('/')[filename.split('/').length-1] //remove path
                    filename = filename.split('.')[0] //remove file extension 
                    
                    if (typeof germline[filename] != 'undefined'){
                        for (var key in germline[filename]){
                            this.allele[key] = germline[filename][key]
                        }
                    }else{
                        console.log({"type": "flash", "msg": "warning : this browser version doesn't have the "+filename+" germline file", "priority": 2});
                    }
                }
            }
        }

        //reduce germline size (keep only detected genes)
        //and add undetected genes (missing from germline)
        var g = {}
        for (var i=0; i<this.m.clones.length; i++){
            if (typeof this.m.clone(i).seg != "undefined" &&
                typeof this.m.clone(i).seg[type2] != "undefined" &&
                typeof this.m.clone(i).seg[type2]["name"] != "undefined"
            ){
                var gene=this.m.clone(i).seg[type2]["name"];
                if (this.m.system != "multi" || this.m.clone(i).get('germline') == system){
                    if ( typeof this.allele[gene] != "undefined"){
                        g[gene] = this.allele[gene]
                    }else{
                        g[gene] = "unknow sequence"
                    }
                }
            }
        }
        this.allele = g
        
        //On trie tous les élèment dans germline, via le nom des objets
        var tmp1 = [];
        tmp1 = Object.keys(this.allele).slice();
        mySortedArray(tmp1);
        var list1 = {};
        //Pour chaque objet, on fait un push sur this.allele
        for (var i = 0; i<tmp1.length; i++) {
            list1[tmp1[i]] = this.allele[tmp1[i]];
        }
        this.allele = list1;
        // console.log(system +"  "+ type)
        
        
        //color
        var key = Object.keys(list1);
        if (key.length != 0){
            var n = 0,
                n2 = 0;
            var elem2 = key[0].split('*')[0];
            for (var i = 0; i < key.length; i++) {
                var tmp = this.allele[key[i]];
                this.allele[key[i]] = {};
                this.allele[key[i]].seq = tmp;
                this.allele[key[i]].color = colorGenerator((30 + (i / key.length) * 290));

                var elem = key[i].split('*')[0];
                if (elem != elem2) {
                    this.gene[elem2] = {};
                    this.gene[elem2].n = n2;
                    this.gene[elem2].color = colorGenerator((30 + ((i - 1) / key.length) * 290));
                    this.gene[elem2].rank = n;
                    n++;
                    n2 = 0;
                }
                elem2 = elem;
                this.allele[key[i]].gene = n
                this.allele[key[i]].rank = n2
                n2++;
            }
            this.gene[elem2] = {};
            this.gene[elem2].n = n2;
            this.gene[elem2].rank = n
            this.gene[elem2].color = colorGenerator((30 + ((i - 1) / key.length) * 290));
        }
        
        return callback
    }
}