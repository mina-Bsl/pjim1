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
function PDF(model, graph_id) {
    this.m = model;
    this.graph_id = graph_id;

    this.page_width = 210
    this.page_height = 297
    this.col_width = 18
    this.first_col_width = 30
    this.height_row = 6
    this.height_sub_row = 4
    this.marge = 15
    this.y = this.marge;
    this.y_max = this.page_height - this.marge

}

PDF.prototype = {

    /*init list
     */
    init: function () {
        this.list = this.m.getSelected()

        if (this.list.length == 0) {
            var flag = 5;
            for (var i = 0; i < this.m.clones.length; i++) {
                if (this.m.clusters[i].length != 0 && flag != 0 && this.m.clone(i).isActive()) {
                    this.list.push(i);
                    flag--;
                }
            }
        }

        this.col_width = (this.page_width - (2 * this.marge) - this.first_col_width) / this.m.samples.order.length

        return this;
    },

    make: function () {
        this.doc = new jsPDF();
        this.y = this.marge;
        this.m.focusOut()
        this.init()
            .header()
            .graph()
            .info()
            .info_selected_clones()
            .print()
        
        return this;
    },
    
    makeGraph: function () {
        this.doc = new jsPDF("l");
        this.y = this.marge;
        this.m.focusOut()
        
        var opt_graph = {"x" : 20,
                         "y" : 5,
                         "w" : 277,
                         "h" : 170,
                         "fontSize" : 20,
                         "strokeSize" : 5
                        }
        
        this.init()
            .graph(opt_graph)
            .label_selected_clones(150,170)
            
        this.doc.setFontSize(20);
        //this.doc.text(this.marge + 10, 190, this.m.getPrintableAnalysisName());
        this.print()
        
        return this;
    },
    
    //test
    mini: function(){
        this.doc = new jsPDF();
        this.y = this.marge;
        this.m.focusOut()
        
        var opt_graph = {"x" : 15,
                         "y" : 10,
                         "w" : 80,
                         "h" : 50,
                         "fontSize" : 6,
                         "strokeSize" : 10
                }
        
        this.init()
            .graph(opt_graph)
            
        opt_graph.x += 100
        this.graph(opt_graph)
        this.print()
        
    },
    
    /*print Header
     */
    header: function () {
        var header_size = 30

        this.checkPage(header_size)

        this.doc.setFontSize(12);
        this.doc.text(this.marge + 120, this.y, 'Vidjil (beta) - http://bioinfo.lifl.fr/vidjil');
        this.doc.text(this.marge + 5, this.y + 5, this.m.dataFileName);
        // todo: fill again with reliable data :)
        // this.doc.text(this.marge + 5, this.y + 10, 'run: 2013-10-03');
        if (typeof this.m.timestamp != 'undefined'){
            this.doc.text(this.marge + 5, this.y + 15, 'analysis: ');// + this.m.timestamp.split(' ')[0]);
        }
        this.doc.text(this.marge + 5, this.y + 20, 'germline: ' + this.m.system);

        this.doc.rect(this.marge, this.y, 60, 23);

        this.y = this.y + header_size
        
        return this;
    },
    
    print: function () {
        this.doc.output('dataurlnewwindow');
        
        return this;
    },

    /*check remaining space on current page
     *begin a new pdf page if neccesary
     */
    checkPage: function (size) {
        if ((this.y + size) > this.y_max) {
            this.y = this.marge
            this.doc.addPage();
        }
        
        return this;
    },

    /* print graph
     */
    graph: function (opt) {
        if (typeof opt == 'undefined'){
            opt = {}
            opt.x = this.marge;
            opt.y = this.y;
            opt.w = 180;
            opt.h = 80;
            opt.fontSize = 8;
            opt.strokeSize = 6;
            
            var graph_size = 90
            this.checkPage(graph_size)
            this.y += graph_size
        }
        
        var elem = document.getElementById(this.graph_id)
            .cloneNode(true);

        var opt2 = {};
        opt2.scaleX = opt.w / document.getElementById(this.graph_id).getAttribute("width")
        opt2.scaleY = opt.h / document.getElementById(this.graph_id).getAttribute("height")
        opt2.x_offset = opt.x;
        opt2.y_offset = opt.y;

        //clones style
        for (var i = 0; i < this.m.clones.length; i++) {
            var polyline = elem.querySelectorAll('[id="polyline'+i+'"]')[0]
            var color = this.m.tag[this.m.clone(i).getTag()].color

            if (polyline.getAttribute("d").indexOf("Z") != -1){
                polyline.setAttribute("style", "stroke-width:0px");
                polyline.setAttribute("fill", color);
            }else{
                polyline.setAttribute("style", "stroke-width:1px");
                polyline.setAttribute("stroke", color);
            }

            if (m.clone(i).isVirtual() || !m.clone(i).isActive()) {
                polyline.parentNode.removeChild(polyline);
            }
        }

        //selected clones style
        for (var i = 0; i < this.list.length; i++) {
            var polyline = elem.querySelectorAll('[id="polyline'+this.list[i]+'"]')[0] 
            var color = this.m.tag[this.m.clone(this.list[i]).getTag()].color

            polyline.setAttribute("stroke", color);
            polyline.setAttribute("style", "stroke-width: "+opt.strokeSize+"px");

            elem.querySelectorAll('[id="clones_container"]')[0]
                .appendChild(polyline);
        }

        //text style
        var textElem = elem.getElementsByTagName("text");

        for (var i = 0; i < textElem.length; i++) {
            if (textElem[i].getAttribute("class") == "graph_time"){
                textElem[i].setAttribute("text-anchor", "middle");
            }else{
                textElem[i].setAttribute("text-anchor", "end");
            }
            textElem[i].setAttribute("font-size", opt.fontSize);
        }

        //
        elem.querySelectorAll('[id="resolution1"]')[0]
            .firstChild.setAttribute("fill", "#eeeeee");

        var timebar = elem.getElementsByClassName("axis_m");
        timebar[0].parentNode.removeChild(timebar[0]);
        
        var hidden = elem.getElementsByClassName("axis_v_hidden");
        for (var i=0; i<hidden.length; i++){
            hidden[i].parentNode.removeChild(hidden[0]);
        }

        var visu2_back = elem.querySelectorAll('[id="visu2_back"]')[0]
        visu2_back.parentNode.removeChild(visu2_back);

        var visu2_back2 = elem.querySelectorAll('[id="visu2_back2"]')[0]
        visu2_back2.parentNode.removeChild(visu2_back2);

        var reso5 = elem.querySelectorAll('[id="resolution5"]')[0]
        reso5.parentNode.removeChild(reso5);
        console.log(opt2)
        console.log(elem)
        svgElementToPdf(elem, this.doc, opt2)

        this.doc.setFillColor(255, 255, 255);
        this.doc.rect(opt.x+opt.w*0.05, opt.y+opt.h+1, opt.w, opt.h, 'F');
        this.doc.setFillColor(0, 0, 0);

        return this;
    },

    info: function () {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');

        this.checkPage(20)
        if (this.m.reads.total) this.checkPage(30)

        //time point
        var time = []
        for (var i=0 ; i<this.m.samples.number; i++){
            time[i] =  this.m.getStrTime(i).split(".")[0];
        }
        this.row('point', time, 'raw')
        this.next_row()

        //info global
        if (this.m.reads.total) {
            this.row('total reads', this.m.reads.total, 'raw')
            this.next_row()
        }

        this.row('total segmented', this.m.reads.segmented, 'raw');

        if (this.m.reads.total) {
            this.next_sub_row()

            var data = []
            for (var i = 0; i < this.m.samples.number; i++) {
                data[i] = this.m.reads.segmented[i] / this.m.reads.total[i]
            }
            this.row('', data, '%')
        }

        this.next_row()

        this.y += 10
        
        return this;
    },

    next_row: function () {
        this.doc.setFillColor(0, 0, 0);
        this.doc.setDrawColor(0, 0, 0)
        this.doc.lines([
            [210 - 2 * (this.marge), 0]
        ], this.marge, this.y + 2)
        this.y += this.height_row
        
        return this;
    },

    next_sub_row: function () {
        this.y += this.height_sub_row
        
        return this;
    },

    row: function (name, data, format) {
        this.doc.text(this.marge, this.y - 1, name);

        var light = true;

        for (var i = 0; i < this.m.samples.order.length; i++) {
            var x = this.marge + this.first_col_width + (this.col_width * i)
            var y = this.y

            if (light) this.doc.setFillColor(240, 240, 240);
            else this.doc.setFillColor(255, 255, 255);
            light = !light

            this.doc.rect(x, y - 3.75, this.col_width, this.height_row, 'F');

            var r = data[this.m.samples.order[i]]
            if (format == "%") r = (r * 100)
                .toFixed(2) + ' %'

            this.doc.text(x, y - 1, ' ' + r);
        }
        
        return this;
    },

    info_clone: function (cloneID) {
        this.checkPage(20)

        var color = this.m.tag[this.m.clone(cloneID).getTag()].color

        this.icon(cloneID, this.marge, this.y - 6, 18, 8)

        //clone name
        this.doc.setFont('courier', 'bold');
        this.doc.setTextColor(color);
        this.doc.text(this.marge + 20, this.y, this.m.clone(cloneID).getName());
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);

        this.next_row()

        //clone reads
        var data = []
        for (var i = 0; i < this.m.samples.number; i++) {
            data[i] = this.m.clone(cloneID).getReads(i)
        }
        this.row('reads', data, 'raw')
        this.next_sub_row()

        //clone reads (%)
        var data = []
        for (var i = 0; i < this.m.samples.number; i++) {
            data[i] = this.m.clone(cloneID).getStrSize(i)
        }
        this.row('', data, 'raw')
        this.next_row()

        this.sequence(cloneID)

        return this;
    },

    sequence: function (cloneID) {

        this.doc.setFont('courier', 'normal');
        this.doc.setTextColor(0, 0, 0)

        if (m.clone(cloneID).getSequence() != "0") {

            var seq = m.clone(cloneID).getSequence()
            var seqV = seq.substring(0, this.m.clone(cloneID).Vend + 1)
            var seqN = seq.substring(this.m.clone(cloneID).Vend + 1, this.m.clone(cloneID).Jstart)
            var seqJ = seq.substring(this.m.clone(cloneID).Jstart)

            //V
            var str;
            this.doc.setTextColor(255, 179, 0)
            for (j = 0; j < (Math.floor(seqV.length / 80) + 1); j++) {
                str = seqV.substring(j * 80, (j + 1) * 80)
                this.doc.text(this.marge, this.y, str);
                this.y += 5;
            }

            // todo: light bar (not taking space) between V/N and N/J borders...

            //N
            this.y -= 5
            for (var j = 0; j < str.length; j++) {
                seqN = ' ' + seqN
            }

            this.doc.setTextColor(0, 0, 40)

            for (j = 0; j < (Math.floor(seqN.length / 80) + 1); j++) {
                str = seqN.substring(j * 80, (j + 1) * 80)
                this.doc.text(this.marge, this.y, str);
                this.y += 5;
            }


            //J
            this.y -= 5
            for (var j = 0; j < str.length; j++) {
                seqJ = ' ' + seqJ
            }

            this.doc.setTextColor(0, 155, 149)

            for (j = 0; j < (Math.floor(seqJ.length / 80) + 1); j++) {
                str = seqJ.substring(j * 80, (j + 1) * 80)
                this.doc.text(this.marge, this.y, str);
                this.y += 5;
            }

        } else {
            this.doc.text(this.marge + 20, this.y, "segment fail :" + m.clone(cloneID).id);
        }

        this.y += 5;
        
        return this;
    },
        
    label_selected_clones: function (x, y) {
        
        var y2 = y
        var max=0;
        for (i = 0; i < this.list.length; i++) {
            var l = this.label_clone(this.list[i], x, y2)
            if (l>max) max=l
            y2=y2+7;
        }
        
        this.doc.setDrawColor(0, 0, 0);
        // this.doc.rect(x, y, max, 2+this.list.length * 7, 'S');
        this.doc.setDrawColor(255, 255, 255);
        
        return this;
    },
    
    label_clone: function (cloneID, x, y) {
        this.doc.setFillColor(255, 255, 255);
        this.doc.rect(x, y, 150, 8, 'F');
        
        this.icon(cloneID, x, y, 18, 8) 
        
        this.doc.setFontSize(12);
        var text = this.m.clone(cloneID).getName()
        this.doc.text(x+20, y+4, text);
        return 20 + text.length*1.5
        
    },
    
    icon: function (cloneID, x, y, w, h) {

        var color = this.m.tag[m.clone(cloneID).tag].color

        var polyline = document.getElementById("polyline" + cloneID)
            .cloneNode(true);
        
            
        if (polyline.getAttribute("d").indexOf("Z") != -1){
            polyline.setAttribute("style", "stroke-width:0px");
            polyline.setAttribute("fill", color);
        }else{
            polyline.setAttribute("style", "stroke-width:50px");
            polyline.setAttribute("stroke", color);
        }

        var res = document.getElementById("resolution1")
            .cloneNode(true);
        res.firstChild.setAttribute("fill", "white");

        var icon = document.createElement("svg");
        icon.appendChild(polyline)
        icon.appendChild(res)

        var opt_icon = {};
        opt_icon.scaleX = w / document.getElementById(this.graph_id).getAttribute("width")
        opt_icon.scaleY = h / document.getElementById(this.graph_id).getAttribute("height")

        opt_icon.x_offset = x
        opt_icon.y_offset = y;

        svgElementToPdf(icon, this.doc, opt_icon)
        this.doc.setDrawColor(150, 150, 150);
        this.doc.setDrawColor(0, 0, 0)
        
        return this;
    },
    
    text_length: function (text, size, font, type) {
        var fontMetrics = this.doc.internal.getFont(font, type)
        .metadata.Unicode;

        return ((this.doc.getStringUnitWidth(text, fontMetrics) * size)/72)*25.4;  
    },

    info_selected_clones: function () {
        for (i = 0; i < this.list.length; i++) {
            this.info_clone(this.list[i])
        }
        
        return this;
    },

}