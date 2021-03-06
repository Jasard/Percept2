/*******************************************************************
--------------------------------------------------------------------
* MAIN.JS
* Core functionality for PERCEPT2.
* Authors:    Jason Ardener
--------------------------------------------------------------------
*******************************************************************/

/**
* GLOBAL VARIABLES
* @var dHeight:     Get the height of available space for callgraph.
* @var fileArray:   Erlang code file lines in an array.
* @var root:        The root of the callgraph
*/
var dHeight = $(window).height() - $('header').height() - 60;
var fileArray;
//var root;

createTree();

/**
 * Generate the tree.
 * @var m:          Margins for the tree canvas.
 * @var w:          Width of the tree canvas.
 * @var h:          Height of the tree canvas.
 * @var i:          Node id.
 * @var root:       ???
 * @var tree:       Tree object.
 * @var diagonal:
 * @var vis:
 * @var pid:
 */
function createTree(){
  var m = [40, 60, 40, 60],
      w = 1080 - m[1] - m[3],
      h = dHeight - m[0] - m[2],
      i = 0,
      root;

  var tree = d3.layout.tree().size([h, w]);
  var diagonal = d3.svg.diagonal().projection(function(d) {
      return [d.y, d.x];
  });
  var vis = d3.select("#graph").append("svg:svg").attr("id", "svg").attr("height", h + m[0] + m[2]).append("svg:g").attr("transform", "translate(" + m[3] + "," + m[0] + ")");
  var pid; //JOEJOEJOE: work out pid!
  var strURL = document.location.toString();
  var pathAndArgs = strURL.split('?');

  // TO BE COMMENTED
  if (pathAndArgs.length > 1)
  {
    var args = pathAndArgs[1].split("&");
    for (var argNum = 0; argNum < args.length - 1; argNum++);
    {
      var argPair = args[argNum].split("=");
      var arg = argPair[0], val = argPair[1];

      if (arg == "pid") pid = val;
    }
  }

  //Set size of graph div to dHeight.
  $("graph").height(dHeight);

  //Check for window resize and adjust the size of graph div.
  $(window).resize(function() {
    dHeight = $(window).height() - $('header').height() - 60;
    $("graph").height(dHeight);
    document.getElementById("graph").innerHTML = "";
    setTimeout(createTree(), 5000);
  });


  d3.text("/cgi-bin/percept2_html/callgraph?pid="+pid, "application/json", function (callgraph)
  {
      console.log("RAW: " + callgraph);

      var parseString =  callgraph  .split('\n').join('')           //remove newlines
                                    .split('\t').join('')           //and tabs
                                    .split(' ').join('')          //and spaces
                                    .substring(2, callgraph.length - 3);  //and pointless recursiveness
      //parse it and show!
      root = parseText(parseString);
      root.x0 = h / 2;
      root.y0 = 0;

      console.log("DONE: \n\n" + JSON.stringify(root, null, '\t'));

      function toggleAll(d) {
          if (d.children) {
              d.children.forEach(toggleAll);
              toggle(d);
          }
      }
      update(root);
  });



  function update(source) {
      var duration = d3.event && d3.event.altKey ? 5000 : 500;

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse();
      var tDepth = 1+ d3.max(nodes, function(x) { return x.depth;});

      var nSpacing = 265;
      var w = tDepth*nSpacing;




      $("#svg").width(w);


      // Normalize for fixed-depth.
      nodes.forEach(function(d) {
          d.y = d.depth * nSpacing;
      });

      // Update the nodes…
      var node = vis.selectAll("g.node").data(nodes, function(d) {
          return d.id || (d.id = ++i);
      });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("svg:g").attr("class", "node").attr("transform", function(d) {
          return "translate(" + source.y0 + "," + source.x0 + ")";
      });

      nodeEnter.append("svg:circle").attr("r", 1e-6).style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      }).on("click", function(d) {
          toggle(d);
          update(d);
      });

      // Adding the text
      nodeEnter.append("svg:text").attr("class", "nText").attr("x", function(d) {
          return d.children || d._children ? -10 : 10;
      }).attr("dy", ".35em").attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
      }).text(function(d) {
          return d.function + " ("+d.callCount+")";
      }).style("fill-opacity", 1e-6).attr("href", function(d) {
          return d.start.row + " " + d.end.row + " " + d.module;
      });

      // Transition nodes to their new position.
      var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) {
          return "translate(" + d.y + "," + d.x + ")";
      });

      nodeUpdate.select("circle").attr("r", 4.5).style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
      });
      nodeEnter.select("text").style("fill-opacity", 1).attr("onclick","getCode(this)");

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition().duration(duration).attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      }).remove();

      nodeExit.select("circle").attr("r", 1e-6);

      nodeExit.select("text").style("fill-opacity", 1e-6);

      // Update the links…
      var link = vis.selectAll("path.link").data(tree.links(nodes), function(d) {
          return d.target.id;
      });

      // Enter any new links at the parent's previous position.
      link.enter().insert("svg:path", "g").attr("class", "link").attr("d", function(d) {
          var o = {
              x: source.x0,
              y: source.y0
          };
          return diagonal({
              source: o,
              target: o
          });
      }).transition().duration(duration).attr("d", diagonal);

      // Transition links to their new position.
      link.transition().duration(duration).attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition().duration(duration).attr("d", function(d) {
          var o = {
              x: source.x,
              y: source.y
          };
          return diagonal({
              source: o,
              target: o
          });
      }).remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
      });

       $(".nText").each(function() {
            //console.log(this);
            //$(this).ellipsis();
      });
  }

  // Toggle children.
  function toggle(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
  }

}

function getFile(module) {
  var query = document.location.toString().split('?')[1];
  console.log(query);

  var filePath = '/cgi-bin/percept2_html/module_content?mod=' + module;
  xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET",filePath,false);
  xmlhttp.send(null);
  var fileContent = xmlhttp.responseText;
  var fileArray = fileContent.split('\n');
  return fileArray;
}

function getCode(text) {
  var values = text.getAttribute('href').split(' ');
  var title = text.firstChild.data;

  var start = values[0]-1;
  var end = values[1];

  if (start == -1)
  {
    alert("No source available for this function.");
    return;
  }
  console.log(start + " " + end);

  var fileArray = getFile(values[2]);

  $('#myModal pre').empty();
  $('#myModal h3').empty();
  $('#myModal h3').append(title);

  for(var i=start; i<end; i++) {
    $('#myModal pre').append(fileArray[i] +'<br/>');
  }

  $('#myModal').modal('toggle');
}

//JOEJOEJOE erlang parsing shenanigans:
function parseText(text) {
  //eat header (call info)
  var callInfo = eatCallInfoTuple(text);
  var i = callInfo.stopIndex;
  var root = callInfo.callgraph;

  if (root === null) return null;

  //eat children
  while (i < text.length)
  {
    var childInfo = eatChild(text, i); //eat one child, and get it's text/end position
    i = childInfo.stopIndex; //fast forward to the end of this child

    if (childInfo.text !== null) //if there was a child and we were at the end...
    {
      var toPush = parseText(childInfo.text);
      if (toPush !== null) root.children.push(toPush); //parse the text of this child into a header + subgraph (recursion!)
    }
  }

  //return this node!
  return root;
}

//parse the header information
function eatCallInfoTuple(text) {
  var i = 0, level = 0, group = 0;
  var buffer = [], currentGroup = [], groups = [];

  //horrible parse loop :)
  while (i < text.length) {
    var thisChar = text.charAt(i);

    if (thisChar == '{')  //got a {, increase bracket level
      level++;
    else if (thisChar == '}') { //got a }, decrease bracket level and increase group/tuple number
      level--;

      if (buffer.length > 0) {
        currentGroup.push(buffer.join('')); //add this entry (string) to the current group
        groups.push(currentGroup); //add the group to the groups

        currentGroup = []; //start a new group
        buffer = []; //start a new entry
        group++;
      }

      if (level == 0) break; //we are done :D
    }
    else if (thisChar == ',') { //got a ,, next string please
      if (buffer.length > 0) {
        currentGroup.push(buffer.join('')); //add this entry (string) to the current group
        buffer = []; //start a new entry
      }
    }
    else buffer.push(thisChar); //got anything else - append string :)

    i++; //next char :)
  }

  //hacky hacky - now we normalise it so it has two {0, 0}'s if we see just one :)
  var normalisedGroups = [];
  groups.forEach(function(group) {
    normalisedGroups.push(group);

    if (group.length == 2 && group[0] == 0 && group[1] == 0)  //push twice, its {0, 0} :O!
      normalisedGroups.push(group)
  });

  if (normalisedGroups.length == 0)
    return { stopIndex: i, callgraph: null };


  //all done - retrieve data from groups and make sensible!
  var noFile = normalisedGroups[1][1] == "0" && normalisedGroups[1][2] == "0";

  var callInfo = {
    module:     normalisedGroups[0][0],
    function:   normalisedGroups[0][1],
    arity:      parseInt(normalisedGroups[0][2]),
    start:      noFile ? { row: 0, column: 0} : { row: parseInt(normalisedGroups[1][1]), column: parseInt(normalisedGroups[1][2]) },
    end:        noFile ? { row: 0, column: 0} : { row: parseInt(normalisedGroups[2][0]), column: parseInt(normalisedGroups[2][1]) },
    callCount:  parseInt(normalisedGroups[noFile ? 6 : 7][0]),
    children:   []
  };


  //return the callgraph and the end index of this header
  return { stopIndex: i, callgraph: callInfo }
}

//parse 1 child and return its textual representation along with ending index
function eatChild(text, i) {
  var level = 0, start = 0, found = 0;

  if (text.length == 2) return { stopIndex: text.length, text: null };            //we found a "[]" and thus no children - return null to say we've reached the end

  while (i < text.length) {
    var thisChar = text.charAt(i);

    if (thisChar == '[')  { //got a {, increase bracket level
      if (start == 0) start = i;

      found++; //we found at least one child here :)
      level++;
    }
    else if (thisChar == ']') { //got a }, decrease level and increase group
      level--;

      if (level == 0) break; //we are done :D
    }

    i++; //next char
  }

  if (found == 0) return { stopIndex: text.length, text: null };            //we found no brackets and thus no children - return null to say we've reached the end
  else      return { stopIndex: i + 1, text: text.substring(start + 1, i) };  //otherwise - return the end index and the textual representation of the child (for parsing)
};
