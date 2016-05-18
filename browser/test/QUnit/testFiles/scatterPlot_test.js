

test("scatterplot : grid", function() {
    var m = new Model(m);
    m.parseJsonData(json_data,100)
    m.loadGermline()
    m.initClones()

    var sp = new ScatterPlot("visu",m);
    sp.init();
    
    equal(sp.returnActiveclones(), 3, "returnActiveClones -> 3");
    
    sp.buildSystemGrid()
    deepEqual(sp.systemGrid,  {"IGH": {"x": 0.92,"y": 0.75},
                                "TRG": {"x": 0.92,"y": 0.25}, 
                                "label": [
                                    {"enabled": true,"text": "TRG","x": 0.81,"y": 0.25 },
                                    {"enabled": true,"text": "IGH","x": 0.80,"y": 0.75}]}, 
            "buildSystemGrid()");
    
    equal(sp.nodes.length, 5 , "check nodes");
    
    sp.changeSplitMethod("gene_v", "gene_v", "plot");
    sp.update()
    equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    equal(sp.axisX.pos(1), sp.axisY.pos(1), "check splitMethod V/V /plot : xpos = ypos");
    equal(document.getElementById("circle1").className.baseVal, "circle", "check splitMethod V/V /plot : check if plot are displayed")
    
    
    sp.changeSplitMethod("gene_v", "gene_v", "bar");
    
    equal(document.getElementById("bar1").className.baseVal, "", "check splitMethod V/V /plot : check if bar are displayed")
    
    $(document.getElementsByClassName("sp_legend")[0]).d3Click() //click label ighv4
    deepEqual(m.getSelected(), [2], "check click label");
    
    
    sp.changeSplitMethod("n", "Size", "bar");
    sp.update()
    
    equal(sp.nodes[1].bar_h , 0.3333333333333333, "bar position : Ok")
    equal(sp.nodes[1].bar_x , sp.axisX.labels[9].pos ,"bar position : Ok")
    equal(sp.axisX.labels[9].text, "9", "bar position : Ok")
    equal(sp.nodes[1].bar_y , 0.3333333333333333, "bar position : Ok")
    
});

