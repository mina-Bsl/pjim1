/*
 * This file is part of Vidjil <http://www.vidjil.org>,
 * High-throughput Analysis of V(D)J Immune Repertoire.
 * Copyright (C) 2013, 2014, 2015 by Bonsai bioinformatics 
 * at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
 * Contributors: 
 *     Antonin Carette <antonin.carette@etudiant.univ-lille1.fr>
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
 * provide a bunch of shortkey to manipulate views/model
 * @class Shortcut
 * @constructor
 * */
function Shortcut () {
    this.init()
    this.on = true
}

var NB_CLONES_CHANGE = 10;

Shortcut.prototype = {
    
    /**
     * compute system list and add event listener to document
     * */
    init : function () {
        var self = this
        
        this.system_shortcuts = {}
        for (var system in germline_data){
            var keycode = germline_data[system].shortcut.toUpperCase().charCodeAt(0)

            if (typeof this.system_shortcuts[keycode] == "undefined")
                this.system_shortcuts[keycode] = []
            
            this.system_shortcuts[keycode].push(system)
        }
        
        document.onkeydown = function (e) { self.checkKey(e); }
        document.onkeyup = function (e) { sp.active_move = false; }
    },
    
    
    /**
     * called each time a key is pressed <br>
     * triggers the related function
     * @param {event} e - onkeydown event
     * */
    checkKey : function (e) {
        if (this.on){
            e = e || window.event;
            if (document.activeElement.id == ""){
                    
                var key = e.keyCode;
                if (key==0) key = e.which
                console.log(e)
                console.log(key)
                switch(key) {
                    case 37 :   //left arrow
                        e.preventDefault()
                        if (e.shiftKey || e.metakey)
                            m.displayTop(m.top - NB_CLONES_CHANGE)
                        else
                            m.previousTime();
                        break;
                    case 39 :   //right arrow
                        e.preventDefault()
                        if (e.shiftKey || e.metakey) 
                            m.displayTop(m.top + NB_CLONES_CHANGE)
                        else
                            m.nextTime();
                        break;
                    case 83 :   //ctrl+s
                        e.preventDefault()
                        if (e.ctrlKey || e.metakey) db.save_analysis()
                        break;
                    case 65 :   //ctrl+a
                        e.preventDefault()
                        if (e.ctrlKey || e.metakey){
                            var d_m = $("#debug_menu")
                            if (d_m.css("display") == "none"){
                                $("#debug_menu").css("display", "");
                                $(".devel-mode").show();
                                $(".beta-mode").show();
                            }else{
                                $("#debug_menu").css("display", "none");
                                $(".devel-mode").hide();
                                $(".beta-mode").hide();
                            }
                        }
                        break;
                    case 80 :   //shift+p : open patient
                        e.preventDefault()
                        if(e.shiftKey || e.metakey) db.reload()
                        break;
                    default:
                        if ( ((key >= 96) && (key <= 105)) || ((key >= 48) && (key <= 57)) ) { // Numeric keypad, 0-9
                            var select_preset = document.getElementsByClassName("axis_select_preset_select")[0]
                            var shift = 95;
                            if (key<58) shift = 47
                            if (e.shiftKey) shift -= 10

                            select_preset.selectedIndex = key - shift;
                            try {
                                sp.changePreset(select_preset)
                            }
                            catch (err) { } // There can be an error if the preset does not exist
                        }
                }
            }
            
            //system shortcuts
            if (typeof this.system_shortcuts[key] != "undefined") {

                    var germlines = this.system_shortcuts[key].filter(function(g) {return m.system_available.indexOf(g) != -1})
                    if (germlines.length == 0)
                        return ;

                    console.log("Germlines with key " + key + ": " + germlines)

                    // Find current germline
                    var current = -1 ;
                    for (var i = 0; i < germlines.length; i++) 
                        {
                            if (germlines[i] == m.germlineV.system)
                                current = i ;
                        }

                    // Cycle to next germline
                    next_germline = germlines[(current+1) % germlines.length]
                    m.changeGermline(next_germline, e.shiftKey)
                } 
            }
            
            if (e.altKey && sp.reinit) {
                sp.active_move = true;
            }
    }
}
