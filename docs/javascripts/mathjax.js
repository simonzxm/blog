window.MathJax = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
    packages: {'[+]': ['extpfeil']},
    macros: {
      d: "{\\mathop{}\\!\\mathrm{d}}"
    }
  },
  loader: {
    load: ['[tex]/extpfeil']
  },
  options: {
    ignoreHtmlClass: "none",
    processHtmlClass: "arithmatex|md-nav__link|md-toc__link"
  }
};