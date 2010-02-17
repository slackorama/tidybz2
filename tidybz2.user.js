// ==UserScript==
// @name        TidyBZ2
// @namespace   http://www.sethmason.com/userscripts
// @description Provide some keyboard shortcuts and clean up the interface for
// bugzilla2 version of bugzilla.
// @include     https://*/show_bug.cgi?id=*
// @include     https://*process_bug.cgi*
// @author      Seth Mason
// @version     0.1
// @license     Creative Commons public domain (http://creativecommons.org/licenses/publicdomain/)
// ==/UserScript

/**
 * Used some of the code from Jesse Ruderman (http://www.squarefree.com) and
 * from JPDaigle (jpdaigle@gmail.com)
 */

try {
(function () {

   // prevent double running
   if (document.body.className.indexOf("tidybz2") !== -1) {
     return;
   }
   document.body.className += " tidybz2";

   // Skip the rest if the user isn't logged in
   var goahead = xpath("//input[@name=\"GoAheadAndLogIn\"]");
   if ( goahead.snapshotLength !== 0 ) {
     return;
   }

   /***************************
    * Convenience methods
    ****************************/
   // simple utility function for doing an xpath query
   function xpath( query, node ) {
     if (arguments.length === 1) {
       node = document;
     }
     return document.evaluate( query,
                          node,
                          null,
                          XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                          null);
   }

   // send a click to the specified element
   function click( el ) {
     var evt = document.createEvent("HTMLEvents");
     evt.initEvent("click", true, true);
     el.dispatchEvent( evt );
   }

   // return a lamdba that'll check the given radio button and put focus in
   // the comments box
   function clickKnobAndComment( knob ) {
     return function() {
       var check = document.getElementById(knob);
       if ( check ) {
         check.checked = true;
       }
       var comment = document.getElementById("comment");
       addClass( comment, "tidybz2Field");
       comment.focus();
     };
   }

   // return a lambda that'll edit the textbox with the given name
   function editTextBox( name, select ) {
     select = (select == undefined ? true : select );
      return function() {
        var form = document.forms.namedItem("changeform");
        var box = form.elements.namedItem(name);
        addClass( box, "tidybz2Field" );
        box.focus();
        if ( select ) {
          box.select();
        }
      };
   }

   // return a lambda that'll set the resolution select list to the given status,
   // check the resolved radio button and put focus in comments box
   function resolveTo( status ) {
     var selectSnap = xpath("//select[@name='resolution']");
     var select;
     if (selectSnap.snapshotLength === 1) {
       select = selectSnap.snapshotItem( 0 );
     }
     return function() {
       var options = select.options;
       var x, option;
       for (x=0;option=options[x];++x) {
         if (option.value.toLowerCase() === status) {
           document.getElementById("knob-resolve").checked = true;
           option.selected = true;
           clickKnobAndComment("knob-resolved")();
         }
       }
     };
   }

        // create a header element
    function createHeaderElement( label_text, content_node) {
        var node = document.createElement('div');
        node.style.display='table-row';
        var label = document.createElement('div');
        label.style.display = 'table-cell';
        label.style.paddingRight = '0.6em';
        label.appendChild( document.createTextNode( label_text + ': ' ) );
        node.appendChild( label );
        var content = document.createElement('div');
        content.style.display='table-cell';
        content.appendChild( content_node.cloneNode( true ) );
        node.appendChild( content );
        return node;
    }

   // remove an element
   function rM( el ) {
     el.parentNode.removeChild( el );
   }

   // get href of first match
   function getLink(query) {
	 var link  = getFirstElement( query );
     if ( link ) {
       return link.href;
     }
     return undefined;
   }

   function getFirstElement( query, node ) {
     var all = xpath( query, node ? node : document );
     if (all.snapshotLength > 0) {
       return all.snapshotItem(0);
     }
     return undefined;
   }

   function getCurVisibleTx() {
	 var allTx, countTx, curTx, prevTx, nextTx;
     allTx = xpath( "//span[@class='bz_comment'] | //a[@name='c0']");
	 countTx = allTx.snapshotLength;
	 var cur_ypos = get_cur_ypos();

	 var i, tx_ypos;
	 for (i = 0; i < countTx; i++) {
	   curTx = allTx.snapshotItem(i);
	   tx_ypos = find_ypos(curTx);
	   if (tx_ypos >= cur_ypos)
		 break;
	 }

	 if (curTx && i == 0 && tx_ypos > (get_cur_ypos() + window.innerHeight)) {
	   // special case: the first comment is below the screen
	   // so we scroll to that
	   return [prevTx, curTx, curTx];
	 }

	 if (i < countTx-1) {
	   nextTx = allTx.snapshotItem(i+1);
	 }
	 if (i > 0) {
	   prevTx = allTx.snapshotItem(i-1);
	 }

	 return [prevTx, curTx, nextTx];
   }

   function scrollNextTx() {
	 var selectTx = getCurVisibleTx();
	 if (selectTx[2]) {
	   window.scroll(0, find_ypos(selectTx[2]));
	 }
   }

   function scrollPrevTx() {
	 var selectTx = getCurVisibleTx();
	 if (selectTx[0]) {
	   window.scroll(0, find_ypos(selectTx[0]));
	 }
   }

   // Find Y position of an object
   function find_ypos(obj) {
	 var curtop = 0;
	 do {
	   curtop += obj.offsetTop;
	 } while (obj = obj.offsetParent);
	 return curtop;
   }

   // Find Y position of the top of the display page
   function get_cur_ypos() {
	 return window.pageYOffset;
   }

   function addClass( el, className ) {
     if (el.className.indexOf(className) === -1) {
       el.className += " " + className;
     }
   }

   var inputtagnames = { 'INPUT':1, 'TEXTAREA':1, 'SELECT':1, 'BUTTON':1 };
   function isInputTag(tag) {
     return inputtagnames[tag.tagName];
   }

   function toggleClass( node, classStr ) {
     if ( (" " + node.className + " ").indexOf(" " + classStr + " ") < 0 ) {
       node.className = (node.className ? " " : "") + classStr;
     }
     else {
       var t = (" " + node.className + " ").replace(" " + classStr + " "," ");
       if ( t != node.className ) {
         node.className = t;
       }
     }
   }

   /***************************
    * Styling
    ***************************/
   // add the given style definition to the page
   function addStyleSheet(s) {
     var sse = document.createElement("style");
     sse.setAttribute("type", "text/css");
     sse.textContent = s;
     document.getElementsByTagName("head")[0].appendChild(sse);
   }

   addStyleSheet( ".tidybz2Header { display:table; margin-bottom: 1em; } " +
                  ".tidybz2Field:focus { background: yellow } " +
                  ".bz_critical { color: red } " +
                  ".bz_blocker { color: red; font-weight: bold }" +
                  "#bz-header-saved .label { font-weight: bold; display: table-cell; padding-right: 0.6em;}" +
                  "#bz-header-saved .links { display: table-cell; }"                  

     );


   /***************************
    * Keyboard shortcuts
    ***************************/
   var keyCommands = { };

   // keyboard navigation for comments
   var MARK = 0, RESOLVE = 1, JUMP = 2, COMMENT = 3, ISSUES = 4, GENERAL = 5, ACTIONS = 6;

   // the first batch of commands are kind of non-standard
   keyCommands['c'] = {
     group: ACTIONS,
     name: "Add a comment",
     func: function () {
       var comment = document.getElementById("comment");
       addClass(comment, "tidybz2Field");
       comment.focus();
     }
   };
   keyCommands['a'] = {
     group: ACTIONS,
     name: "Assign Issue",
     func: function() {
       var check = document.getElementById("knob-reassign");
       if ( check ) {
         check.checked = true;
       }
       var sel = getFirstElement("//select[@name='assigned_to']");
       if (sel) {
         sel.focus();
       }
       else {
         check.focus();
       }
     }
   };
   keyCommands["U"] = {
     group: GENERAL,
     name: "Browse URL",
     func: function() {
       var url = document.forms.namedItem("changeform").elements
         .namedItem("bug_file_loc").value;
       if (url !== "" ) {
         location.href = url;
       }
     }
   };
   keyCommands["^s"] = {
     group: GENERAL,
     name: "Commit edits",
     func: function() {
       var form = getFirstElement("//form[@name='changeform']");
       if (form) {
         form.submit();
       }
     }
   };

   keyCommands["y"] = {
     group: COMMENT,
     name: "Reply to the current comment",
     func: function() {
       var selected = getCurVisibleTx();
       if (selected[1]) {
         var link = getFirstElement( ".//a[text()='reply']", selected[1]);
         addClass(document.getElementById("comment"), "tidybz2Field");
         if (link) {
           click( link );
         }
         else {
           // try the td
           link = getFirstElement( ".//a[text()='reply']", selected[1].parentNode.parentNode);
           if (link) {
             click( link );
           }
         }
       }
     }
   };



   // key combinations
   // these are for marking after bug is fixed
   var subKeyCommands = {};
   subKeyCommands['m'] = {
     group: MARK,
     commands:     [
       ["v", createMarkFunc("verify","verified")],
       ["c", createMarkFunc("close","closed")]]
   };

   // these are for resolving status
   subKeyCommands['r'] = {
     group: RESOLVE,
     commands:[
       ["f", createResolvedFunc("fixed")],
       ["i", createResolvedFunc("invalid")],
       ["l", createResolvedFunc("later")],
       ["r", createResolvedFunc("remind")],
       ["w", createResolvedFunc("worksforme")]
     ]
   };

   // go commands (move off the page)
   subKeyCommands['g'] = {
     group: JUMP,
     commands: [
     ["s", function() {
             return {
               name: "Show last search results",
               func: function() {
		         var lastResultsLink = getLink("//a[contains(text(),'last search results')]");
		         if (lastResultsLink)
			       window.location = lastResultsLink;
               }
             };
      }()],
      ["n", function() {
         return {
           name: "Go to  new issue page",
           func: createClickFunc("//a[text()='Enter new issue']")
             };
           }()
      ],
       [ "f", function() {
           return {
             name: "Go to first issue in list",
             func: createClickFunc("//a[text()='First']")
           };
         }()],
       [ "l", function() {
         return {
           name: "Go to last issue in list",
           func: createClickFunc("//a[text()='Last']")
         };
         }()]
     ]
   };

   var x, key;
   for (var sub in subKeyCommands) {
     keyCommands[sub] = { group: subKeyCommands[sub].group, children: { } };
     var commands = subKeyCommands[sub].commands;
     for (x=0;key=commands[x];++x) {
       keyCommands[sub].children[ key[0]] = key[1];
     }
   }

   // return a object ref that can be bound to a key for resolution
   function createResolvedFunc( status ) {
     return {
       name: "Resolve to " + status,
       func: resolveTo( status )
     };
   }

   // return an object ref that can be bound to a key for marking
   function createMarkFunc( knob, nice ) {
     return {
       name: "Mark as " + nice,
       func: clickKnobAndComment("knob-" + knob)
     };
   }

   // create a function that'll pretend we clicked a link
   function createClickFunc( query ) {
     return function() {
       var link = getLink( query );
       if (link) {
         window.location = link;
       }
     };
   }

   // shortcuts that are kind of standard
   var ACTION_TYPE = 0, EDIT_TYPE = 1, CLICK = 2;
   var fields = [
     [undefined,                   "Open Shortcut Help",     "?", showShortcuts,       ACTION_TYPE, GENERAL],
     [undefined,                   "Focus next comment",     "j", scrollNextTx,        ACTION_TYPE, COMMENT],
     [undefined,                   "Focus previous comment", "k", scrollPrevTx,        ACTION_TYPE, COMMENT],
     ["knob-take",                 "Take Issue",             "t", clickKnobAndComment, ACTION_TYPE, ACTIONS],
     ["knob-reopen",               "Reopen Issue",           "R", clickKnobAndComment, ACTION_TYPE, ACTIONS],
     ["knob-leave",                "Leave Issue as is",      "l", clickKnobAndComment, ACTION_TYPE, RESOLVE],
     ["comment",                   "Comment",                "c", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["short_desc",                "Summary",                "s", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["keywords",                  "Keywords",               "w", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["deadline",                  "Deadline",               "d", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["dependson",                 "Depends On",             "o", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["blocked",                   "Blocked",                "b", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["bug_file_loc",              "URL",                    "u", editTextBox,         EDIT_TYPE,   ACTIONS],
     ["//a[text()='Search page']", "Search bugs",            "/", createClickFunc,     ACTION_TYPE, GENERAL],
     ["//a[text()='Next']",        "Go to next issue",       "n", createClickFunc,     ACTION_TYPE, ISSUES],
     ["//a[text()='Prev']",        "Go to previous issue",   "p", createClickFunc,     ACTION_TYPE, ISSUES]
   ];

   // put the fields in the array
   var i, field;
   for (i=0;field=fields[i];++i) {
     keyCommands[ field[2] ] = setupField( field );
   }

   function setupField( field ) {
     var id = field[0],
       nice = field[1],
       key = field[2],
       func = field[3],
       perform_type = field[4],
       group = field[5];

       return {
         group: group,
         name: (perform_type === EDIT_TYPE ? "Edit " : "")  + nice,
         func: id === undefined ? func : func(id)
     };
   }

   // show an alert dialog with the keyboard shortcuts
   function showShortcuts() {
     //TODO: This could use some prettying up on output
     var s = "TidyBZ2 shortcuts:\n\n";
//   var MARK = 0, RESOLVE = 1, JUMP = 2, COMMENT = 3, ISSUES = 4, GENERAL = 5, ACTIONS = 6;
     var mark = "Marking issue:\n";
     var resolving = "Resolving issue:\n";
     var jumping = "Jumping:\n";
     var isssues = "Issue navigation:\n";
     var comments = "Comment navigation:\n";
     var general = "Application:\n";
     var actions = "Actions:\n";

     for (var p in keyCommands) {
       switch (keyCommands[p].group) {
       case MARK:
         mark += makeDisplay( p, keyCommands[p] );
         break;
       case RESOLVE:
         resolving += makeDisplay( p, keyCommands[p] );
         break;
       case JUMP:
         jumping += makeDisplay( p, keyCommands[p] );
         break;
       case COMMENT:
         comments += makeDisplay( p, keyCommands[p] );
         break;
       case ISSUES:
         isssues += makeDisplay( p, keyCommands[p] );
         break;
       case GENERAL:
         general += makeDisplay( p, keyCommands[p] );
         break;
       case ACTIONS:
         actions += makeDisplay( p, keyCommands[p] );
         break;
       }
     }
     s += general + "\n" +
       actions + "\n" +
       resolving + "\n" +
       comments + "\n" +
       mark + "\n" +
       isssues + "\n" +
       jumping + "\n";
     s += "\nPress ESC to un-focus any form field";
     alert(s);
   }

   function makeDisplay( p, command ) {
     var s = "";
     if (! command.children ) {
       s += "   " + p + " - " +  command.name + "\n";
     }
     else {
       for (var k in command.children) {
         s += "   " + p + " then " + k + " - " +
           command.children[k].name + "\n";
       }
     }
     return s;
   }

   // listen for escape key to defocus input box
   function escKeyListener( evt ) {
     if (evt.ctrlKey || evt.metaKey || evt.altKey) {
       return;
     }
     if (evt.keyCode == 27) { // DOM_VK_ESCAPE
       if (isInputTag( evt.target ) ) {
         evt.target.blur();
         evt.preventDefault();
       }
     }
   }

   var secondary;
   // handle keypresses for defined shortcut keys
   function shortcutKeyListener( evt ) {
     if ( evt.metaKey || evt.altKey ) {
       return;
     }
     if (isInputTag( evt.target ) ) {
       return;
     }
     var s = String.fromCharCode( evt.charCode );
     if (! s ) {
       return;
     }
     if (evt.ctrlKey) {
       s = "^" + s;
     }
     if (secondary != null) {
       if (secondary[s]) {
         secondary[s].func( evt );
         evt.preventDefault();
       }
       secondary = null;
     }
     else if ( keyCommands[s] ) {
       if (keyCommands[s].children) {
         secondary = keyCommands[s].children;
         evt.preventDefault();
       }
       else {
         keyCommands[s].func( evt );
         evt.preventDefault();
       }
     }
   }

   /*******************************************************
    * Add listenters
    *******************************************************/
   if (window.addEventListener) {
     window.addEventListener("keypress", shortcutKeyListener, false);
     window.addEventListener("keydown", escKeyListener, false);
   }

   /*****************************************************
    * Cosmetics
    *****************************************************/
   // define a new header
   var headerNode = document.getElementById("header");
    if (headerNode) {
   var titleEl =  getFirstElement( ".//h2", headerNode );
   var tidybz2Header = document.createElement( "div" );
   tidybz2Header.className = "tidybz2Header";
   if (titleEl) {
     var title = titleEl.innerHTML;
     var h1 = document.createElement("h1");
     h1.innerHTML = title;
       headerNode.parentNode.insertBefore( h1, headerNode );       

     var bug = getFirstElement( ".//h1", headerNode );
     if ( bug ) {
         var title = document.title;
         var bug = title.match(/[0-9]+/)[0];
         tidybz2Header.appendChild(
             createHeaderElement('Bug',
                                 document.createTextNode(bug)
                                )
         );

       // var bugHead = document.createElement("div");
       // bugHead.appendChild( document.createTextNode( bugId ) );
       // tidybz2Header.appendChild( bugHead );
     }
     var reporterNode = getFirstElement("/html/body/form/table/tbody/tr/td[3]/table/tbody/tr/td[2]/a");
       if ( reporterNode ) {
           tidybz2Header.appendChild(
               createHeaderElement(
                   'Reporter',
                   reporterNode.firstChild
               )
           );
       }
       var statusNode = getFirstElement(".//form/table/tbody/tr/td/table/tbody/tr[4]/td[2]");
       if (statusNode) {
           tidybz2Header.appendChild(
               createHeaderElement( 'Status',
                                    statusNode.firstChild )
           );
       }
       var assignedToNode = getFirstElement("/html/body/form/table/tbody/tr/td/table/tbody/tr[6]/td[2]");
       if (assignedToNode) {
           tidybz2Header.appendChild(
               createHeaderElement( 'Assigned to',
                                    assignedToNode.firstChild )
           );
       }
       var severityNode = document.getElementById('bug_severity');
       if (severityNode) {
           var severity = severityNode.options[severityNode.selectedIndex].value;
           var className = tidybz2Header.className + ' bz_' + severity;
           tidybz2Header.className = className;
       }
   }
   headerNode.parentNode.insertBefore( tidybz2Header, headerNode );
        var savedLinks = document.getElementById('links-saved');
        if (savedLinks) {
            var wrapper = document.createElement('div');
            wrapper.style.display = 'table';
            var saved = savedLinks.cloneNode( true )
            saved.style.display = 'table-row';
            saved.id = 'bz-header-saved';
            wrapper.appendChild( saved );
            headerNode.parentNode.insertBefore( wrapper,
                                                headerNode );

        }

   document.body.style.margin = "1em";

   /******************************************************
    * Get rid of elements we don't want/need/like
    ********************************************************/
   rM( document.getElementById("banner") );
   rM( headerNode );
    }

 })();

} catch(e) {
  alert("Error loading TidyBZ2 bugzilla:\n\n" + e);
}
