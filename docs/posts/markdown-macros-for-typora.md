---
date: 2025-12-13
categories: [Studying, Math]
slug: markdown-macros-for-typora
---

# Markdown macros for Typora

注意括号的 4 个只有 Typora 能用，因其较为特别的 MathJax 配置。

不建议用这 4 个，如果你不只用 Typora 的话。

<!-- more -->

/// details | Macros
```markdown
% Init
\newcommand{\nc}{\newcommand}
\nc{\on}{\operatorname}

% General
\nc{\(}{\left(}
\nc{\)}{\right)}
\nc{\[}{\left[}
\nc{\]}{\right]}
\nc{\abs}[1]{\left|#1\right|}
\nc{\ds}{\displaystyle}

% Calculus
\nc{\d}{\mathop{}\!\mathrm{d}}
\def\dn[#1]#2#3{\frac{\d^#1#2}{\d#3^#1}}
\def\ddn[#1]#2#3{\dfrac{\d^#1#2}{\d#3^#1}}
\nc{\dd}[2]{\frac{\d#1}{\d#2}}
\nc{\ddd}[2]{\dfrac{\d#1}{\d#2}}
\nc{\de}[1]{\frac{\d}{\d#1}}
\nc{\dde}[1]{\dfrac{\d}{\d#1}}
\nc{\arccot}{\on{arccot}}
\nc{\arcsec}{\on{arcsec}}
\nc{\arccsc}{\on{arccsc}}
\nc{\asin}{\arcsin}
\nc{\acos}{\arccos}
\nc{\atan}{\arctan}
\nc{\acot}{\arccot}
\nc{\asec}{\arcsec}
\nc{\acsc}{\arccsc}
\nc{\ea}{\Biggr|}
\nc{\dint}{\ds\int}
\nc{\dsum}{\ds\sum}
\nc{\dprod}{\ds\prod}

% Linear Algebra
\nc{\bs}{\boldsymbol}
\nc{\T}{^{\mathrm{T}}}
\nc{\bm}{\begin{matrix}}
\nc{\em}{\end{matrix}}
\nc{\bpm}{\begin{pmatrix}}
\nc{\epm}{\end{pmatrix}}
\nc{\bbm}{\begin{bmatrix}}
\nc{\ebm}{\end{bmatrix}}
\nc{\bvm}{\begin{vmatrix}}
\nc{\evm}{\end{vmatrix}}
\nc{\r}{\on{r}}
\nc{\rank}{\on{rank}}
```
///