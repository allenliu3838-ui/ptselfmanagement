/* educationContent.js — Load and register education content from JSON files
 *
 * This module loads content/education/*.json and registers them with the engine.
 * For a static site (no build step), we inline the content at load time.
 */

(function loadEducationContent() {
  // Content files to load
  var CONTENT_FILES = [
    "content/education/ckd-core.json",
    "content/education/bp-education.json",
    "content/education/diet-individualized.json",
    "content/education/dialysis-redflags.json",
    "content/education/transplant.json",
    "content/education/diabetes.json",
    "content/education/pediatric.json",
    "content/education/stone-adpkd.json",
    "content/education/advanced-markers.json",
    "content/education/vaccines.json"
  ];

  var LAB_FILES = [
    "content/education/lab-explanations.json"
  ];

  var loaded = 0;
  var total = CONTENT_FILES.length + LAB_FILES.length;

  function onAllLoaded() {
    if (typeof console !== "undefined") {
      console.log("[Education] Loaded " + getAllEducationCards().length + " education cards, " + LAB_EXPLANATION_CARDS.length + " lab explanation cards");
    }
    // Trigger re-render if the app is already initialized
    if (typeof renderAll === "function") {
      try { renderAll(); } catch(_e) {}
    }
  }

  function checkDone() {
    loaded++;
    if (loaded >= total) onAllLoaded();
  }

  function loadJSON(url, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0) {
            try {
              var data = JSON.parse(xhr.responseText);
              callback(data);
            } catch(e) {
              if (typeof console !== "undefined") console.warn("[Education] Parse error for " + url, e);
            }
          } else {
            if (typeof console !== "undefined") console.warn("[Education] Failed to load " + url + " (status " + xhr.status + ")");
          }
          checkDone();
        }
      };
      xhr.send();
    } catch(e) {
      if (typeof console !== "undefined") console.warn("[Education] XHR error for " + url, e);
      checkDone();
    }
  }

  // Load education card files
  for (var i = 0; i < CONTENT_FILES.length; i++) {
    loadJSON(CONTENT_FILES[i], function(data) {
      if (typeof registerEducationCards === "function") {
        registerEducationCards(data);
      }
    });
  }

  // Load lab explanation files
  for (var j = 0; j < LAB_FILES.length; j++) {
    loadJSON(LAB_FILES[j], function(data) {
      if (typeof registerLabExplanations === "function") {
        registerLabExplanations(data);
      }
    });
  }
})();
