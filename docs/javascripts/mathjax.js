window.MathJax = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
    packages: {'[+]': ['ams', 'extpfeil']},
    macros: {
      d: "{\\mathop{}\\!\\mathrm{d}}"
    }
  },
  loader: {
    load: ['[tex]/ams', '[tex]/extpfeil']
  },
  options: {
    ignoreHtmlClass: "none",
    processHtmlClass: "arithmatex|md-nav__link|md-toc__link"
  }
};

document$.subscribe(() => { 
  MathJax.startup.output.clearCache()
  MathJax.typesetClear()
  MathJax.texReset()
  MathJax.typesetPromise()
})