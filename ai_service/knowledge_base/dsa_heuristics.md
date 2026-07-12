# DSA and Algorithmic Execution Guidelines

## Dynamic Programming Heuristics
Dynamic Programming (DP) solves complex problems by breaking them down into simpler sub-problems and saving their results to avoid redundant calculations.
- **Top-Down (Memoization)**: Recursive structure. Computes values on-demand and caches them in a hash table or array. Easy to write but incurs recursive call-stack overhead.
- **Bottom-Up (Tabulation)**: Iterative structure. Fills a table from base cases up to the target state. Solves call-stack limits and can often be optimized for space (rolling arrays).
- **Space Optimization**: If the transition relation `dp[i][j]` only reads from the previous row `dp[i-1]`, you can optimize space complexity from $O(N \times M)$ to $O(M)$ by maintaining a single row array.

## Graph Traversals and Complexity
- **BFS (Breadth-First Search)**: Uses a Queue. Finds the shortest path in unweighted graphs. Time Complexity: $O(V + E)$.
- **DFS (Depth-First Search)**: Uses a Stack (or recursion). Explores paths fully. Ideal for cycle detection and topological sorting. Time Complexity: $O(V + E)$.
- **Dijkstra Heuristic**: Finds shortest path in weighted graphs with non-negative edge weights. Uses a Min-Heap Priority Queue. Time Complexity: $O((V + E) \log V)$.
