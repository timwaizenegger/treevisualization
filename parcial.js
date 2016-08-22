 /* This file is released under the GNU General Public License, version 3
 * */
 var jsonFile = "minitree.json";
            var dataset;
            var dataP;
            var inicialTree = [];
            var text;


            var margin = {top: 20, right: 120, bottom: 20, left: 120},
                width = 1000 - margin.right - margin.left,
                height = 800 - margin.top - margin.bottom;
                
            var i = 0,
                duration = 750,
                root;

            var tree = d3.layout.tree()
                .size([height, width]);

            var diagonal = d3.svg.diagonal()
                .projection(function(d) { return [d.y, d.x]; });

            var svg = d3.select("body").append("svg")
                .attr("width", width + margin.right + margin.left)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            

                d3.json(jsonFile, function(error, data){
                if(error){
                    console.log(error);
                } else {
                    console.log(data);

                    dataP = data;
                    dataset = jsonToFlare(data);
                    root = dataset[0];
                    root.x0 = height / 2;
                    root.y0 = 0;

                    d3.select(self.frameElement).style("height", "500px");

                    var open = [];
                    /* For the start configuration of the tree
                    * takes the first node of each level and let
                    * their open
                    * */
                    for(var i = 0; i < data.levels-1; i++){
                        open.push(pidFop(data.partitionSize, i));
                    }
                    inicialTree = open;
                    closeTree(root, open);
                    update(root);

                    /* reset button using the open list configuration
                    * */
                    d3.select("body").append("input")
                    .attr("type", "button")
                    .attr("value", "Reset Tree")
                    .on("click", function(){closeTree(root, open)});

                    /* Create the select list for the objects names
                    * */
                    text = d3.select("body").append("select")
                      .attr('id', "valueText");

                    /* add to the objects from the objectsMapping
                    * a link to their father in order to find the path
                    * for then later when the user selects an object
                    * */
                    var optionList = [];
                    for(i in data.objectMapping)
                    {
                        for(var j = 0; j < data.objectMapping[i].length; j++){
                            if(data.objectMapping[i][j] != null)
                                data.objectMapping[i][j]['parent'] = i;
                        }
                        optionList = optionList.concat(data.objectMapping[i]);
                    }
                    /* The value of an <option> is the parent number
                    * */
                    text.selectAll('option')
                      .data(optionList).enter()
                      .append('option').text(function(d){return d.objName})
                      .attr('value',function(d){return d.parent+"|"+d.objName} );

                    /* By clicking the search button it calls the leafPath function
                    *  with the value of the option selected
                    * */
                    d3.select("body").append("input")
                    .attr("type", "button")
                    .attr("value", "Search Node")
                    .on("click", function(){
                        searchNode(root, text, data);
                    });

                }


            });
            /* text is a string in the format "parent|object_name"
            *  source is the root tree
            *  data is the raw data from the json file
            * */
            function searchNode(source, text, data){
                var path = [];
                var aux = text.property("value").toString().split("|");
                leafPath( parseInt(aux[0]),data.partitionSize,path);
                rightChildren(source,path,aux[1]);
                closeTree(source, path);
                update(root);
            }

            function rightChildren(source, openNodes, object ) {
                /* Go through all children
                * */
                var inChildren = 0;
                var next = null;
                var down = 1;

                if(source._children != null){
                    click(source);

                }

                if(source.children != null) {
                    while (!inChildren) {

                        source.children.forEach(function (d) {

                            if (openNodes.indexOf(d.name) > -1 && d.type == "key") {
                                inChildren = 1;
                                next = d;
                            }
                            else if (d.type == "object" && d.name == object) {
                                inChildren = 1;
                            }
                        });

                        if (!inChildren) {
                            if(down) {
                                clickDown(source.children[source.children.length - 1]);
                                if(source.siblings_down.length == 0){
                                    down = 0;
                                }
                            }
                            else{
                                clickUp(source.children[0]);
                                if(source.siblings_up.length == 0){
                                    down = 1;
                                }
                            }
                        }
                    }
                }

                if(next != null){
                    rightChildren(next,openNodes,object);
                }

            }

            function leafPath(value, ps, path){

                var number = value;
                /* By a number/key node name, finds all the path
                *  from the root to this current number
                *  returning it in a list
                * */
              if(number>0){
                var parent = parseInt((number-1)/ps);
                path.push(number);
                  leafPath(parent, ps, path);
              }else {
                  path.push(0);
              }
            }

            function closeTree(source, openNodes){
                /* Uses the click function to let just the nodes
                *  in the array openNodes open in the tree. the remain
                *  do not show its children
                * */
              var nodes = tree.nodes(source).reverse();

                nodes.forEach(function(d) {
                    /* The actual node d is the node tested to be in the path
                    *  So to open & show the path, the node d have to be in its parent children
                    * */

                    if (d.children != null && openNodes.indexOf(d.name) < 0) {
                        changeChildren(d);
                        //console.log(d);
                    }
                    else if(d._children != null &&  openNodes.indexOf(d.name) >-1){
                        changeChildren(d);
                    }
                });
            }

            function update(source) {

              // Compute the new tree layout.
              var nodes = tree.nodes(root).reverse(),  // list of the nodes objects, descending
                  links = tree.links(nodes);

              // Normalize for fixed-depth.
              nodes.forEach(function(d) { d.y = d.depth * 100; }); // the distance between nodes

              // Update the nodes…
              var node = svg.selectAll("g.node")
                  .data(nodes, function(d) { return d.id || (d.id = ++i); });

              // Enter any new nodes at the parent's previous position.
              var nodeEnter = node.enter().append("g")
                  .attr("class", "node")
                  .attr("transform", function() { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                  .on("click", function(d){
                      if(d.type == "down" || d.type == "object_down")
                          return clickDown(d);
                      else if (d.type == "up" || d.type == "object_up")
                          return clickUp(d);
                      else return click(d)});

                // append circles and rectangles to the nodes
              nodeEnter.append("circle")
                  .attr("r", 1e-6)
                  .style("fill", function(d) {  return d._children ? "lightsteelblue" : "#fff"; });

                nodeEnter.append("rect")
                    .attr("width", 0)
                    .attr("height", 0)
                    .style("fill", function(d) {
                        if (d.type == "master") return "#f26363";
                        else  return d._children ? "lightsteelblue" : "#fff"; });


               nodeEnter.append("svg:image")
               .attr("xlink:href", function (d) { return d.type == "key" ? "key.svg" : ( d.type == "master" ? "masterkey.svg": ( d.type == "object" ? "file.svg":
                   (d.type == "up" || d.type == "down" ? "pluskey.svg" : "plusfile.svg") ));})
                .attr("x", "-10px")
                .attr("y", "-24px")
                .attr("width", "37px")
                .attr("height", "37px");


               // the label of the node
              nodeEnter.append("text")
                  .attr("x", function(d) { return d.children || d._children ? -13 : 25; })
                  .attr("dy", ".35em")
                  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                  .text(function(d) { return d.name; })
                  .style("fill-opacity", 1e-6);

              // Transition nodes to their new position.
              var nodeUpdate = node.transition()
                  .duration(duration)
                  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

                // the new style after the transition
              



              nodeUpdate.select("text")
                  .style("fill-opacity", 1);

              // Transition exiting nodes to the parent's new position.
              var nodeExit = node.exit().transition()
                  .duration(duration)
                  .attr("transform", function() { return "translate(" + source.y + "," + source.x + ")"; })
                  .remove();

              nodeExit.select("circle")
                  .attr("r", 1e-6);

              nodeExit.select("text")
                  .style("fill-opacity", 1e-6);

              // Update the links…
              var link = svg.selectAll("path.link")
                  .data(links, function(d) { return d.target.id; });

              // Enter any new links at the parent's previous position.
              link.enter().insert("path", "g")
                  .attr("class", "link")
                  .attr("d", function() {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                  });

              // Transition links to their new position.
              link.transition()
                  .duration(duration)
                  .attr("d", diagonal);

              // Transition exiting nodes to the parent's new position.
              link.exit().transition()
                  .duration(duration)
                  .attr("d", function() {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                  })
                  .remove();

              // Stash the old positions for transition.
              nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
              });
            }

            function clickDown(d){
                // add the list up object
                if(d.parent.siblings_up.length == 0) {
                    if (d.type == "object_down")
                        d.parent.children.splice(0, 0, {"name": "up", "children": null, "type": "object_up"});
                    else
                        d.parent.children.splice(0, 0, {"name": "up", "children": null, "type": "up"});
                }
                 /* Remove the last 5 children from the parent
                 * */
                 var newSiblings;

                if(d.parent.siblings_up.lenght == 0)
                   newSiblings = d.parent.children.splice(0,d.parent.children.length -1);
                else
                   newSiblings = d.parent.children.splice(-6,5);
                // Take new children from the siblings_down
                 var newChildren = d.parent.siblings_down.splice(0,5);
                 newChildren.forEach(function(e){d.parent.children.splice(-1,0,e);});

                // put the old children in siblings_up
                 d.parent.siblings_up = d.parent.siblings_up.concat(newSiblings);

                // if comes to the end of the list siblings_down, remove the list down objetc
                if(d.parent.siblings_down.length == 0)
                    d.parent.children.splice(-1,1);

                 update(d);
             }
            function clickUp(d){

                // take the new children
                var newChildren = d.parent.siblings_up.splice(d.parent.siblings_up.length -5,5);

                var newSiblings;
                // remove children
                if(d.parent.siblings_down.length == 0){
                    newSiblings = d.parent.children.splice(1, d.parent.children.length - 1);

                    if (d.type == "object_up")
                        d.parent.children.splice(1, 0, {"name": "down", "children": null, "type": "object_down"});
                    else
                        d.parent.children.splice(1, 0, {"name": "down", "children": null, "type": "down"});
                }
                else{
                    newSiblings = d.parent.children.splice(-6,5);
                }

                newChildren.forEach(function(e){d.parent.children.splice(-1,0,e);});


                d.parent.siblings_down =  newSiblings.concat(d.parent.siblings_down);

                if(d.parent.siblings_up.length == 0)
                    d.parent.children.splice(0,1);

                 update(d);
            }
            // Toggle children on click.
            function changeChildren(d){
                if (d.children) {
                d._children = d.children;
                d.children = null;
              } else {
                d.children = d._children;
                d._children = null;
              }
            }
            function click(d) {
              changeChildren(d);
              update(d);
            }


                function jsonToFlare(data){
                    /* Start with the root of the tree that is always 0
                    *  Then get all the other nodes recursively using getChildren
                    * */
                    var name = 0; //pidFop(data.partitionSize, 0);  it is always 0
                    var children = getChildren(name, 1, data);
                    return [{"name": name, "children": children[0],"siblings_up": null, "siblings_down": children[1], "type": "master"}];
                }

                function getChildren(parent, level, data){
                    var children = [];
                    var siblings = [];
                    var k = 0;
                    var i;
                    if(level == data.levels){
                        /* Case that maps the objects keys to the leafs
                        *  their behavior is different since their name is not related to te tree structure
                        *  as are the non-objects-partitions nodes
                        * */
                        var objects = data.objectMapping[parent];

                        /* Sort the objects by the slot number
                        * */
                        objects.sort(function(a,b){ return a.slot-b.slot});

                        if(objects != null) {

                            if (objects.length > 5){

                                /* Creates the first plus node with no siblings
                                * show: false , because it will not appear yet
                                * */
                                //children[0] = {name: "...", "children": null, "type": "object_up", "show": false};
                                /* Iterates in all children
                                * */
                                for (i = 0; i < 5; i++) {
                                    /* Just plus nodes have siblings
                                    * */
                                    children[i] = {name: objects[i].objName, "children": null, "type": "object", "show": true};
                                }

                                for(i= 5; i < objects.length; i++){
                                    /* Hide the children
                                     * */
                                    siblings[i-5] = {name: objects[i].objName, "children": null, "type": "object","show": false };
                                }
                                /* Add the siblings to the plus nodes
                                * */
                                //children[0]["siblings"] = siblings;
                                children[5] = {name: "...", "children": null, "type": "object_down", "show": false};

                            }
                            else {
                                for (i = 0; i < objects.length; i++) {
                                    children[i] = {name: objects[i].objName, "children": null, "type": "object"};
                                }
                            }
                        }
                    }
                    else {
                        /* For the actual parent node it calculates the first and last children
                        * and see if all its interval of children are in the used partition
                        * and add the ones that are
                        * */
                        var first = (parent*data.partitionSize) + 1;
                        var last = (parent+1)*data.partitionSize;
                        var childs;


                        children[0] = {"name": "...", "children": null, "type": "up"};
                        k = 1;
                        for (i = first; i <= last; i++) { // for each child of this parent
                            if (data.usedPartitions.indexOf(i) > -1) {

                                if(k < 6){
                                    childs = getChildren(i, level + 1, data);
                                    children[k] = {"name": i, "children": childs[0], "siblings_up": [], "siblings_down": childs[1] , "type": "key"};
                                }
                                else{
                                    childs = getChildren(i, level + 1, data);
                                    siblings[k-6] = {"name": i, "children": null ,"_children": childs[0], "siblings_up": [], "siblings_down": childs[1] , "type": "key"};
                                }

                                k++;
                            }
                            // if a node is not in used partitions, it is not showed

                        }

                        if(children.length < 7 && siblings.length == 0){
                            children.splice(0,1);
                        }
                        else{
                            children.splice(0,1);
                            children[children.length] = {"name": "...", "children": null, "type": "down"};
                        }


                    }
                    return [children, siblings];

                }

                function pidFop(ps, level){
                    /* Calculates the first node of a level
                    * */
                    return (Math.pow(ps, level) - 1)/(ps-1);
                }
