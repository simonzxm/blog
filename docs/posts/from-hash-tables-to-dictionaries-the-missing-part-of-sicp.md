---
date: 2026-01-17
categories: [Studying, SICP]
slug: from-hash-tables-to-dictionaries-the-missing-part-of-sicp
---

# From hash tables to dictionaries: <br> the missing part of SICP

> 笔者在研读 [Dictionaries and Python OOP](https://github.com/KEDIT2007/NJU-SICP-Essays/blob/main/dict-and-python-oop/Dictionaries%20and%20Python%20OOP.md) 的时候意识到自己对 Python 字典的实现了解不够，便在这一方向进行了深入探索。
> 
> 我们的 [SICP](https://sicp.pascal-lab.net/2025/) 课程没有涉及这一数据结构，我相信也有其他学习者想要深入了解字典的实现原理；因此我不妨写一份讲义，来系统地讲解 Python 字典的设计思想，希望后来者也能少走一些弯路。

!!! note
    这份讲义不适合以下读者：

    - 期望以此学习基本语法。
    - 期望以此提高课内成绩。
    
    建议在阅读后完成配套练习。

<!-- more -->

## Table of Scores

The SICP final exam scores have just been released, and we need a data structure to store them and provide an efficient lookup service. A straightforward approach is to use a list of key-value pairs.

Note that each student appears at most once in our data, so `__setitem__` should create a new entry if the key does not exist, or update the existing entry if it does.

/// details | Example 1
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

Let's consider a more efficient approach: binary search. The table below compares the time complexities of linear search and binary search.

| Algorithm | Search | Insertion |
| --- | --- | --- |
| Linear Search | $O(n)$ | $O(n)$ (amortized $O(1)$ if no duplicates) |
| Binary Search | $O(\log n)$ | $O(n)$ |

When searching for a key, we compare it with the element at the middle index. If the key is not found, we recursively search in the appropriate half of the sorted list.

However, insertion is more complex because we must maintain the sorted order. We first find the correct position for the new key using binary search, which takes $O(\log n)$ time, and then insert it.

??? question "Why is insertion $O(n)$ instead of $O(\log n)$?"
    Although we can quickly find the correct position in $O(\log n)$ time using binary search, we must shift all subsequent elements backward by one position, which takes $O(n)$ time in the worst case.

/// details | Example 2
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

For our current scale of 115 students, either algorithm works fine. However, imagine scaling this to include all SICP students across all sessions and institutions worldwide over the past decades. In that case, even $O(\log n)$ performance would be insufficient. We would need an algorithm with an average-case time complexity of $O(1)$ for both searching and insertion.

This is where **hash tables** come in.

The core idea behind a hash table is to compute an index, or "hash," directly from a key. This hash maps the key to a specific position in an underlying array, often called "buckets." This allows us to store and retrieve values in what is ideally $O(1)$ time, as we can access array elements by index directly without searching.

This process is called **hashing**, and the algorithm that performs the calculation is known as a **hash function**. For instance, in our student scores example, a simple hash function might map a student's name to an index based on its first letter. All names starting with "A" would go into bucket 0, "B" into bucket 1, and so on.

However, this approach introduces a new problem: what if multiple keys map to the same index? This is called a **hash collision**. For example, "Salt" and "Sprite" might both hash to the same bucket. A common strategy to resolve this is **separate chaining** (also known as **open hashing**), where each bucket holds a list of all key-value pairs that have hashed to that index. When a collision occurs, we simply append the new pair to the list in the corresponding bucket.

While we can design custom hash functions for specific data, a general-purpose hash table needs a way to handle arbitrary data types. Fortunately, Python provides a universal solution: the built-in [`__hash__`](https://docs.python.org/3/reference/datamodel.html#object.__hash__) method. For any hashable object, we can call this method to get a hash value. We then use the modulo operator (`%`) with the table's capacity to scale this value into a valid index for our bucket array.

/// details | Example 3
```pyodide
from pprint import pformat

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
        return (f"======== HashTable ========\n"
                f"Capacity: {self._capacity}, Size: {self._size}\n"
                f"Buckets:\n"
                f"{pformat(self._buckets, width=32)}\n"
                f"===========================")


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

However, as we add more entries to a simple hash table, the lists within each bucket grow longer. In the worst case, all entries could hash to the same bucket, causing the search time to degenerate to $O(n)$. To prevent this, we need to dynamically resize the hash table when it becomes too full. This process is called **rehashing**.

During rehashing, we create a new, larger table and re-insert all existing entries. It's important to note that simply copying the old table is not enough; we must recalculate the index for each entry based on the new capacity. To optimize this, industrial implementations often store the original hash of the key alongside the key-value pair. This avoids re-computing the hash, which can be slow for complex objects. When a collision occurs, we can first compare the stored hashes. Only if the hashes are identical do we proceed with a full key comparison, which may be more time-consuming.

/// details | Example 4
```pyodide
class RehashableHashTable(HashTable):
    def __init__(self, capacity=8):
        self._load_factor_threshold = 0.75
        super().__init__(capacity)

    def __setitem__(self, key, value):
        if self._size / self._capacity >= self._load_factor_threshold:
            self._resize()
        h_code = hash(key)
        idx = h_code % self._capacity
        bucket = self._buckets[idx]
        for i, (h, k, v) in enumerate(bucket):
            if h == h_code and k == key:
                bucket[i] = (h, k, value)
                return
        bucket.append((h_code, key, value))
        self._size += 1

    def __getitem__(self, key):
        h_code = hash(key)
        idx = h_code % self._capacity
        bucket = self._buckets[idx]
        for h, k, v in bucket:
            if h == h_code and k == key:
                return v
        raise KeyError(key)

    def _resize(self):
        old_buckets = self._buckets
        self._capacity *= 2
        self._buckets = [[] for _ in range(self._capacity)]
        self._size = 0
        for bucket in old_buckets:
            for h, k, v in bucket:
                new_idx = h % self._capacity
                self._buckets[new_idx].append((h, k, v))
                self._size += 1

# Demo
table = RehashableHashTable(4)
for index, letter in enumerate(["Axe", "Salt", "Sprite"]):
    table[letter] = index
print(table)
table["777"] = 3
print(table)
```
///

## Dictionaries in Python

But the implementations above are not how dictionaries work in Python. While Python's dictionaries are indeed hash tables, they use a more sophisticated approach to handle collisions and store entries.

Instead of separate chaining, Python uses **open addressing** (also known as **closed hashing**). When a collision occurs, the algorithm **probes** for the next available empty slot in the table itself, rather than creating a list.

Python employs a complex probing sequence designed to minimize clustering, a phenomenon where collisions group together and degrade performance. This sequence is generated by the algorithm you will see in the following code. The probing algorithm is designed to work efficiently with a table whose capacity is a power of two, which is why hash table implementations often use capacities like $2^n$.

/// details | [cpython/Objects/dictobject.c](https://github.com/python/cpython/blob/main/Objects/dictobject.c)
    type: quote
```c
#define PERTURB_SHIFT 5

/*
Major subtleties ahead:  Most hash schemes depend on having a "good" hash
function, in the sense of simulating randomness.  Python doesn't:  its most
important hash functions (for ints) are very regular in common
cases:

  >>>[hash(i) for i in range(4)]
  [0, 1, 2, 3]

This isn't necessarily bad!  To the contrary, in a table of size 2**i, taking
the low-order i bits as the initial table index is extremely fast, and there
are no collisions at all for dicts indexed by a contiguous range of ints. So
this gives better-than-random behavior in common cases, and that's very
desirable.

OTOH, when collisions occur, the tendency to fill contiguous slices of the
hash table makes a good collision resolution strategy crucial.  Taking only
the last i bits of the hash code is also vulnerable:  for example, consider
the list [i << 16 for i in range(20000)] as a set of keys.  Since ints are
their own hash codes, and this fits in a dict of size 2**15, the last 15 bits
 of every hash code are all 0:  they *all* map to the same table index.

But catering to unusual cases should not slow the usual ones, so we just take
the last i bits anyway.  It's up to collision resolution to do the rest.  If
we *usually* find the key we're looking for on the first try (and, it turns
out, we usually do -- the table load factor is kept under 2/3, so the odds
are solidly in our favor), then it makes best sense to keep the initial index
computation dirt cheap.

The first half of collision resolution is to visit table indices via this
recurrence:

    j = ((5*j) + 1) mod 2**i

For any initial j in range(2**i), repeating that 2**i times generates each
int in range(2**i) exactly once (see any text on random-number generation for
proof).  By itself, this doesn't help much:  like linear probing (setting
j += 1, or j -= 1, on each loop trip), it scans the table entries in a fixed
order.  This would be bad, except that's not the only thing we do, and it's
actually *good* in the common cases where hash keys are consecutive.  In an
example that's really too small to make this entirely clear, for a table of
size 2**3 the order of indices is:

    0 -> 1 -> 6 -> 7 -> 4 -> 5 -> 2 -> 3 -> 0 [and here it's repeating]

If two things come in at index 5, the first place we look after is index 2,
not 6, so if another comes in at index 6 the collision at 5 didn't hurt it.
Linear probing is deadly in this case because there the fixed probe order
is the *same* as the order consecutive keys are likely to arrive.  But it's
extremely unlikely hash codes will follow a 5*j+1 recurrence by accident,
and certain that consecutive hash codes do not.

The other half of the strategy is to get the other bits of the hash code
into play.  This is done by initializing a (unsigned) vrbl "perturb" to the
full hash code, and changing the recurrence to:

    perturb >>= PERTURB_SHIFT;
    j = (5*j) + 1 + perturb;
    use j % 2**i as the next table index;

Now the probe sequence depends (eventually) on every bit in the hash code,
and the pseudo-scrambling property of recurring on 5*j+1 is more valuable,
because it quickly magnifies small differences in the bits that didn't affect
the initial index.  Note that because perturb is unsigned, if the recurrence
is executed often enough perturb eventually becomes and remains 0.  At that
point (very rarely reached) the recurrence is on (just) 5*j+1 again, and
that's certain to find an empty slot eventually (since it generates every int
in range(2**i), and we make sure there's always at least one empty slot).

Selecting a good value for PERTURB_SHIFT is a balancing act.  You want it
small so that the high bits of the hash code continue to affect the probe
sequence across iterations; but you want it large so that in really bad cases
the high-order hash bits have an effect on early iterations.  5 was "the
best" in minimizing total collisions across experiments Tim Peters ran (on
both normal and pathological cases), but 4 and 6 weren't significantly worse.

Historical: Reimer Behrends contributed the idea of using a polynomial-based
approach, using repeated multiplication by x in GF(2**n) where an irreducible
polynomial for each table size was chosen such that x was a primitive root.
Christian Tismer later extended that to use division by x instead, as an
efficient way to get the high bits of the hash code into play.  This scheme
also gave excellent collision statistics, but was more expensive:  two
if-tests were required inside the loop; computing "the next" index took about
the same number of operations but without as much potential parallelism
(e.g., computing 5*j can go on at the same time as computing 1+perturb in the
above, and then shifting perturb can be done while the table index is being
masked); and the PyDictObject struct required a member to hold the table's
polynomial.  In Tim's experiments the current scheme ran faster, produced
equally good collision statistics, needed less code & used less memory.

*/
```
///

You may notice that open addressing requires a resizable hash table. When all slots are filled, there is no place for the next entry, and a rehash is necessary. Because of this, an open-addressing hash table becomes much less efficient as it approaches full capacity. To maintain performance, the load factor threshold for resizing is typically lower—around 0.66—compared to the 0.75 we used for separate chaining.

/// details | Example 5
```pyodide
class OpenAddressingHashTable(RehashableHashTable):
    def __init__(self, capacity=8):
        self._capacity = capacity
        self._buckets = [None] * self._capacity
        self._size = 0
        self._load_factor_threshold = 0.66

    def _get_slots(self, key):
        h_code = hash(key)
        capacity = self._capacity
        idx = h_code % capacity
        perturb = abs(h_code)
        while True:
            yield idx, h_code
            perturb >>= 5
            idx = (5 * idx + 1 + perturb) % capacity

    def __setitem__(self, key, value):
        if self._size / self._capacity >= self._load_factor_threshold:
            self._resize()
        for idx, h_code in self._get_slots(key):
            slot = self._buckets[idx]
            if slot is None:
                self._buckets[idx] = (h_code, key, value)
                self._size += 1
                return
            h, k, v = slot
            if h == h_code and k == key:
                self._buckets[idx] = (h, key, value)
                return

    def __getitem__(self, key):
        for idx, h_code in self._get_slots(key):
            slot = self._buckets[idx]
            if slot is None: raise KeyError(key)
            h, k, v = slot
            if h == h_code and k == key: return v

    def _resize(self):
        old_buckets = self._buckets
        self._capacity *= 2
        self._buckets = [None] * self._capacity
        self._size = 0
        for item in old_buckets:
            if item:
                h, k, v = item
                self.__setitem__(k, v)
                
# Demo
table = OpenAddressingHashTable(4)
for index, letter in enumerate(["Axe", "Salt", "Sprite"]):
    table[letter] = index
print(table)
table["777"] = 3
print(table)
```
///

??? question "Why does Python use this seemingly more complicated method?"
    Open addressing improves cache performance by storing entries in a contiguous block of memory, leading to more efficient memory usage and faster access times.

## More Compact, More Pythonic

However, memory is still not used optimally in our open-addressing table. Since Python 3.7, dictionaries use a more compact structure consisting of two arrays: a sparse `indices` array and a dense `entries` array. This design also has the benefit of preserving insertion order, a feature that was not guaranteed in older versions of Python.

For example, a table that was previously stored as:

```python
entries = [(-1504418768, '777', 3),
           (-1236400450, 'Salt', 1),
           None,
           None,
           None,
           (1672187917, 'Axe', 0),
           (1268770814, 'Sprite', 2),
           None]
```

would instead be organized as follows, where `-1` in the `indices` array indicates an empty slot:

```python
indices = [2, -1, -1, -1, -1, 0, 1, 3]
entries = [[1672187917, 'Axe', 0],
           [-1236400450, 'Salt', 1],
           [1268770814, 'Sprite', 2],
           [-1504418768, '777', 3]]
```
In this structure, the `indices` array maps a hash to an index in the `entries` array. The `entries` array stores the key-value pairs (along with their original hash) in the order they were inserted. This separation makes the table more memory-efficient and allows for ordered iteration.

/// details | Example 6
```pyodide
class CompactHashTable(OpenAddressingHashTable):
    def __init__(self, capacity=8):
        self._capacity = capacity
        self._indices = [-1] * self._capacity
        self._entries = []
        self._size = 0
        self._load_factor_threshold = 0.66

    def __setitem__(self, key, value):
        if self._size / self._capacity >= self._load_factor_threshold:
            self._resize()
        for idx, h_code in self._get_slots(key):
            entry_idx = self._indices[idx]
            if entry_idx == -1:
                self._indices[idx] = len(self._entries)
                self._entries.append([h_code, key, value])
                self._size += 1
                return
            h, k, v = self._entries[entry_idx]
            if h == h_code and k == key:
                self._entries[entry_idx][2] = value
                return

    def __getitem__(self, key):
        for idx, h_code in self._get_slots(key):
            entry_idx = self._indices[idx]
            if entry_idx == -1: raise KeyError(key)
            h, k, v = self._entries[entry_idx]
            if h == h_code and k == key: return v

    def _resize(self):
        old_entries = self._entries
        self._capacity *= 2
        self._indices = [-1] * self._capacity
        self._entries = []
        self._size = 0
        for h, k, v in old_entries:
            self.__setitem__(k, v)

    def __repr__(self):
        return (f"======== HashTable ========\n"
                f"Capacity: {self._capacity}, Size: {self._size}\n"
                f"Indices:\n"
                f"{pformat(self._indices, width=32)}\n"
                f"Entries:\n"
                f"{pformat(self._entries, width=32)}\n"
                f"===========================")

# Demo
table = CompactHashTable(4)
for index, letter in enumerate(["Axe", "Salt", "Sprite"]):
    table[letter] = index
print(table)
table["777"] = 3
print(table)
```
///

## Deletion
left as an exercise for the reader.

You can download it [here](../assets/posts/from-hash-tables-to-dictionaries-the-missing-part-of-sicp/hw-Code.zip).

- Implement the `__delitem__` method for each of the hash table classes presented.
- When implementing deletion for open-addressing tables, you will need a special `Dummy` object to mark deleted slots. This is because simply setting a slot to `None` would break the probing chain, making it impossible to find items that were inserted after the deleted one.
  ```python
  Dummy = object()
  ```
  When a slot is marked as `Dummy`, the probing algorithm knows to continue its search, whereas `None` indicates the end of a chain.

!!! quote "Reference"
    - [1] [GitHub] cpython/Objects/dictobject.c, <https://github.com/python/cpython/blob/main/Objects/dictobject.c>
    - [2] [GitHub] cpython/Objects/dictnotes.txt, <https://github.com/python/cpython/blob/main/Objects/dictnotes.txt>
    - [3] [Python-Dev] More compact dictionaries with faster iteration, <https://mail.python.org/pipermail/python-dev/2012-December/123028.html>