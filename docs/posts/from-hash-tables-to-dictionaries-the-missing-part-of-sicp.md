---
date: 2026-01-16
categories: [Studying, SICP]
slug: from-hash-tables-to-dictionaries-the-missing-part-of-sicp
---

# From hash tables to dictionaries: <br> the missing part of SICP

> 笔者在研读 [Dictionaries and Python OOP](https://github.com/KEDIT2007/NJU-SICP-Essays/blob/main/dict-and-python-oop/Dictionaries%20and%20Python%20OOP.md) 的时候意识到自己对 Python 字典的实现了解不够，便在这一方向进行了深入探索。
> 
> 我们的 [SICP](https://sicp.pascal-lab.net/2025/) 课程没有涉及这一数据结构，我相信也有其他学习者想要深入了解字典的实现原理；因此我不妨写一份讲义，来系统地讲解 Python 字典的设计思想，希望后来的学习者也能少走一些弯路。

!!! note
    这份讲义不适合以下读者：

    - 期望以此学习基本语法。
    - 期望以此提高课内成绩。
    
    建议在阅读后完成配套练习。

<!-- more -->

## Table of Scores

The SICP final exam scores have just been released. We need a data structure to store them and provide an efficient lookup service. A straightforward approach is to use a list of key-value pairs.

Note that each student appears at most once in our data, so `__setitem__` should create a new entry if the key does not exist, or update the existing entry if it does.

/// details | Solution
```pyodide
class LinearTable:
    def __init__(self):
        self._container = []

    def __setitem__(self, key, value):
        """Maps to: table[key] = value"""
        for i, (k, v) in enumerate(self._container):
            if k == key:
                self._container[i] = (key, value)
                return
        self._container.append((key, value))

    def __getitem__(self, key):
        """Maps to: value = table[key]"""
        for k, v in self._container:
            if k == key: return v
        raise KeyError(key)

    def __contains__(self, key):
        """Maps to: 'key' in table"""
        try:
            self[key]
            return True
        except KeyError:
            return False

    def __repr__(self):
        return f"LinearTable({self._container!r})"

# Demo
table = LinearTable()
print("Sprite" in table)
table["Sprite"] = 91
print("Sprite" in table)
table["Axe"] = 99
print(table["Axe"])
table["Axe"] = 100 # Correcting a score
print(table["Axe"])
print(table)
```
///

!!! info "For more information about the magic methods used here, refer to the [Python Documentation](https://docs.python.org/3/reference/datamodel.html#emulating-container-types)."

Let's consider a more efficient approach: binary search.

| Algorithm | Searching | Insertion |
| --- | --- | --- |
| Linear | $O(n)$ | $O(n)$ (amortized $O(1)$ if no duplicates) |
| Binary Search | $O(\log n)$ | $O(n)$ |

When searching for a key, we compare it with the element at the middle index. If the key is not found, we recursively search in the appropriate half of the sorted list.

However, insertion is more complex because we must maintain a sorted order. We need to find the correct position for the new key using binary search ($O(\log n)$), and then insert it.

??? question "Why is insertion $O(n)$ instead of $O(\log n)$?"
    Although we can quickly find the correct position in $O(\log n)$ time using binary search, we must shift all subsequent elements backward by one position, which takes $O(n)$ time in the worst case.

/// details | Solution
```pyodide
class BinarySearchTable:
    def __init__(self):
        self._container = []

    def _find_index(self, key):
        low = 0
        high = len(self._container) - 1
        while low <= high:
            mid = (low + high) // 2
            mid_key = self._container[mid][0]
            if mid_key == key: return mid, True
            elif mid_key < key: low = mid + 1
            else: high = mid - 1
        return low, False

    def __setitem__(self, key, value):
        idx, found = self._find_index(key)
        if found: self._container[idx] = (key, value)
        else: self._container.insert(idx, (key, value))

    def __getitem__(self, key):
        idx, found = self._find_index(key)
        if found: return self._container[idx][1]
        raise KeyError(key)

    def __contains__(self, key):
        try:
            self[key]
            return True
        except KeyError:
            return False

    def __repr__(self):
        return f"BinarySearchTable({self._container!r})"

# Demo
table = BinarySearchTable()
print("Sprite" in table)
table["Sprite"] = 91
print("Sprite" in table)
table["Axe"] = 99
print(table["Axe"])
table["Axe"] = 100 # Correcting a score
print(table["Axe"])
print(table)
```
///

## More Students, More Scores

For our current scale of 115 students, either algorithm works fine. However, imagine scaling to include all SICP students across all sessions and institutions worldwide over the past decades. In that case, $O(\log n)$ performance would be insufficient—we would need an algorithm with an average-case time complexity of $O(1)$ for searching and insertion.

This is where **hash tables** come in.

The core idea behind a hash table is to compute an index, or "hash," directly from a key. This hash then maps the key to a specific position in an underlying array, often called "buckets." This allows us to store and retrieve values in what is ideally $O(1)$ time, as we can access array elements by index directly without searching.

This process is called **hashing**, and the algorithm that performs the calculation is known as a **hash function**. For instance, in our student scores example, a simple hash function might map a student's name to an index based on its first letter. All names starting with "A" would go into bucket 0, "B" into bucket 1, and so on.

However, this approach introduces a new problem: what if multiple keys map to the same index? This is called a **hash collision**. For example, "Salt" and "Sprite" might both hash to the same bucket. A common strategy to resolve this is **separate chaining** (a.k.a. **open hashing**), where each bucket holds a list of all key-value pairs that have hashed to that index. When a collision occurs, we simply append the new pair to the list in the corresponding bucket.

While we can design custom hash functions for specific data, a general-purpose hash table needs a way to handle arbitrary data types. Fortunately, Python provides a universal solution: the built-in [`__hash__`](https://docs.python.org/3/reference/datamodel.html#object.__hash__) method. For any hashable object, we can call this method to get a hash value. We then use the modulo operator (`%`) with the table's capacity to scale this value into a valid index for our bucket array.

/// details | Solution
```pyodide
class HashTable:
    def __init__(self, capacity=8):
        self._capacity = capacity
        self._buckets = [[] for _ in range(self._capacity)]
        self._size = 0

    def _get_index(self, key):
        return hash(key) % self._capacity

    def __setitem__(self, key, value):
        idx = self._get_index(key)
        bucket = self._buckets[idx]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        self._size += 1

    def __getitem__(self, key):
        idx = self._get_index(key)
        bucket = self._buckets[idx]
        for k, v in bucket:
            if k == key: return v
        raise KeyError(key)

    def __contains__(self, key):
        try:
            self[key]
            return True
        except KeyError:
            return False

    def __repr__(self):
        return f"HashTable({self._buckets!r})"

# Demo
table = HashTable(8)
print("Sprite" in table)
table["Sprite"] = 91
print("Sprite" in table)
table["Axe"] = 99
print(table["Axe"])
table["Axe"] = 100 # Correcting a score
print(table["Axe"])
print(table)
```
///

> to be continued..