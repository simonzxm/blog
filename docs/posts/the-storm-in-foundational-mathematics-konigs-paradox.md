---
date: 2025-11-20
categories: [Studying, Math]
slug: the-storm-in-foundational-mathematics-konigs-paradox
---

# The Storm in Foundational Mathematics: König's Paradox

> Gyula Konig proposed the following paradox: By the Well Ordering Theorem, the real number set $\mathbb{R}$ can be well ordered. We study the elements of $\mathbb{R}$ and classify them. If a real number can be defined using a finite number of symbols, then we say it is finitely definable. Otherwise, we say it is undefinable. Obviously, undefinable real numbers exist, because finitely definable real numbers must be countable, while $\mathbb{R}$ is uncountable. It is also obvious that, in the well order, the "smallest" elements, i.e., the beginning elements, are finitely definable. So the question is where we can find the first undefinable number. If $x$ is the first undefinable number, then its immediate predecessor is finitely definable. However, the above relationship with a finitely definable number should make $x$ finitely definable as well.
>
> How do you think of this paradox? Write an essay of no more than 1000 words.

<!-- more -->

=== "English"

    The early 20th century saw stormy seas in the foundations of mathematics with the introduction of the Axiom of Choice and the Well-Ordering Theorem by Ernst Zermelo. Against this backdrop, Gyula König's paradox, proposed in 1905, presented a direct challenge to the non-constructive conclusion of the Well-Ordering Theorem.

    König's argument was logically rigorous and powerful: assume the set of real numbers can be well-ordered (i.e., accept the Well-Ordering Theorem); this assumption leads to a logical contradiction concerning the first undefinable number; therefore, the initial assumption (the Well-Ordering Theorem) must be false. Within the then-accepted framework of naïve set theory and the Well-Ordering Theorem, the logical derivation of this paradox was irrefutable. König himself was convinced that it proved the set of real numbers could not be well-ordered.

    However, König's conclusion was soon rejected by the mathematical mainstream, as most eventually accepted the Axiom of Choice and the Well-Ordering Theorem. Consequently, mathematicians turned their focus to finding a flaw in the concept of "definability" used within the paradox.

    The contradiction of the paradox centers on the description of the smallest undefinable number, $x$: $x$ is the first undefinable real number under the well-ordering. Yet, this very description is self-contradictory: this finite sentence semantically defines $x$ as "the first undefinable real number under the well-ordering." Since $x$ has been designated and described by a finite, explicit sentence, it should be classified as finitely definable according to the paradox’s own criteria. The unavoidable contradiction arises because $x$ is constructed to be undefinable while simultaneously satisfying the condition of definability.

    This self-negating logical loop is the classic structure of a semantic paradox. Similarly, Berry’s Paradox attempts to construct "the smallest integer not definable in fewer than sixty English words," but the construction itself uses a finite number of words to define the very number it should be unable to define. Together, these paradoxes reveal a crucial fact: the expressive power of human language is too great, allowing us to construct self-referential sentences that are formally unstable in logic.

    These unstable language constructs are known in logic as the Metalanguage—the language used to describe, analyze, and discuss the symbols and rules of mathematics. In contrast, the Object Language is the language used to describe things, perform computations, and execute mathematical reasoning. The essence of the aforementioned paradoxes is that they involve the metalanguage referring to itself, hence their classification as Semantic Paradoxes.

    The modern solution in logic is to strictly distinguish between these two languages and prevent their confusion. The error in König's paradox lies in its attempt to construct a set $U$ (all undefinable real numbers) within the object language (ZFC set theory), where membership in $U$ depends on a metalanguage property ("finite definability"). Therefore, "the set of all undefinable real numbers" must be considered an illegitimate Proper Class, rather than a well-defined set, within ZFC set theory. Once the construction is invalidated, the premise for applying the Well-Ordering Theorem also fails, and the paradox is naturally eliminated.

    König's Paradox ultimately failed to overthrow the Well-Ordering Theorem and the Axiom of Choice. Instead, paradoxically, it reinforced the rigor of the mathematical system. Along with other paradoxes of its time, it provided crucial evidence for the reconstruction of 20th-century mathematical foundations. These crises drove mathematicians to develop the Theory of Types and refine Axiomatic Set Theory (ZFC), whose core purpose is to prevent the emergence of such self-reference and hierarchical confusion by limiting the use of sets and language.

    Ultimately, König's Paradox remains a significant historical footnote, serving as a warning: to construct a consistent mathematical world, we must rigorously distinguish the boundary between the things we discuss and the language we use to discuss them. The certainty of mathematics relies on this strict, formalized linguistic discipline.

=== "中文"

    二十世纪初，随着恩斯特·策梅洛（Ernst Zermelo）提出选择公理和良序定理，数学基础领域波涛汹涌。而久拉·科尼格（Gyula König）于 1905 年提出的悖论，正是对良序定理非构造性结论的直接挑战。

    科尼格的论证逻辑严谨而强大：假设实数集可以被良序（即接受良序定理）；这会导致关于第一个不可定义数的逻辑矛盾；因此，最初的假设（良序定理）是错误的。在 当时公认的朴素集合论和良序定理的框架内，这一悖论的逻辑推导无可辩驳；科尼格本人也确信这证明了实数集不能被良序。

    然而，科尼格的结论很快被主流数学界拒绝，因为大多数人最终接受了选择公理和良序定理。因此，数学家们转而寻找悖论中“定义”概念的缺陷。

    悖论的矛盾集中在对最小不可定义数 $x$ 的描述上：$x$ 是良序下第一个不可定义的实数。然而，这句描述本身就是自相矛盾的：这个有限的句子，从语义上将 $x$ 定义为“良序下第一个不可定义的实数”。既然 $x$ 已被一个有限的、明确的句子所指称和描述，根据悖论自身的标准，它就应该被归类为有限可定义的。 $x$ 满足可定义的条件，却被构造为不可定义的，这显然构成了矛盾，无可逃避。

    这种自我否定的逻辑循环，是语义学悖论的经典结构。伯里悖论（Berry's Paradox）试图构造“不能用少于六十个英文字母定义的最小整数”，但这个构造本身就用有限的词语定义了它本应无法定义的数。这两个悖论共同揭示了一个事实：人类语言的表达能力过于强大，它允许我们构造出自我指涉的句子，这些句子在形式逻辑上是不稳定的。

    这些不稳定的语言，在逻辑学中被称为元语言（Metalanguage），即用来描述、分析和讨论数学的符号和规则的语言。与此相对，对象语言（Object Language）则是用来描述事物、进行计算和执行数学推理的语言。上述悖论的本质，就是涉及到元语言对自身的指涉，因而被称为语义学悖论。

    现代逻辑学的解决方案是严格区分这两种语言，并阻止其混淆。科尼格悖论的错误在于，它试图在对象语言（ZFC 集合论）中构造一个集合 $U$（所有不可定义的实数），而 $U$ 的成员资格却取决于一个元语言的属性（“有限可定义性”）。因此，“所有不可定义的实数”在 ZFC 集合论应被视为一个不合法的真类，而非一个定义良好的集合。一旦该构造不成立，良序定理的应用前提也就不成立，悖论自然被消除。

    科尼格悖论最终没有推翻良序定理和选择公理，反而以一种矛盾的方式巩固了数学体系的严谨性。它与同时代的其他悖论一起，为 20 世纪数学基础的重建提供了关键证据。这些危机促使数学家们发展了类型论（Theory of Types），并完善了公理化集合论（ZFC），其核心目的就是通过限制集合和语言的使用，来阻止这种自指和层次混淆的出现。

    最终，科尼格悖论成为了一个重要的历史注脚，它警示我们：在构建一致的数学世界时，必须严格区分我们讨论的事物和讨论事物所用的语言之间的界限。数学的确定性，正依赖于这种严谨的、形式化的语言纪律。
