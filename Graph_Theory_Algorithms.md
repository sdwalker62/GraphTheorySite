# Graph Theory Algorithms

## Depth-First Search (DFS) [see also: https://en.wikipedia.org/wiki/Depth-first_search]

- Input
  - A simple graph in adjacency list format
  - A starting vertex
    - This is optional. If not provided, DFS will start from an arbitrary location.
    - This is accomplished through adjacency list ordering, which we assume takes place when you provide a starting vertex.
- Internal (not accessible after run)
  - `visited[]` - A list containing whether the indexed vertex was touched by DFS.
    - All entries of this list will always be set to true when DFS completes.
    - This is populated by Explore, an internal subroutine of DFS.
- Output
  - `ccnum[]` - A list containing the connected component number of the indexed vertex.
    - Vertices reachable from the starting vertex will have a connected component number of $1$.
  - `prev[]` - A list containing the parent vertex of the indexed vertex, which can be used to create a path from the starting vertex to any reachable vertex.
    - Unreachable vertices and the starting vertex have a parent of `nil`.
  - `pre[]` - A list containing the pre-visit number for the indexed vertex.
  - `post[]` - A list containing the post-visit number for the indexed vertex.
- Runtime
  - $O(n + m)$
- Common uses
  - Finding connected components on a graph
  - Finding a cycle in a graph
  - Producing a path from starting vertex to a reachable vertex

---

## Topological Sort (see also: <https://en.wikipedia.org/wiki/Topological_sorting>)

- Input
  - A simple, directed, acyclic graph in adjacency list format
- Output
  - `order[]` - A list of vertices, sorted in topological ordering from source to sink.
    - **Note**: This output is indexed numerically rather than by vertex.
  - All outputs from the run of Depth-First Search (DFS) are also available to you.
- Runtime:
  - $O(n + m)$
- Common uses:
  - Finding the topological sorting in a DAG

---

### Strongly Connected Components (SCC) [see also: https://en.wikipedia.org/wiki/Strongly_connected_component]

- Input:
  - A simple, directed graph in adjacency list format
- Output:
  - `G_SCC = (V_SCC, E_SCC)` - The strongly connected components metagraph, provided in adjacency list format.
    - By construction, the metagraph is a DAG with vertices sorted from sink to source
      - This ordering is known as reverse topological ordering.
  - All **outputs** from the final run of Depth-First Search (DFS) are also available to you.
    - This data is used to connect entities in the metagraph to the original input graph.
    - For example, the first vertex in `V_SCC` represents all vertices with `ccnum[v] = 1` from the DFS outputs from the original input graph.
- Runtime:
  - $O(n + m)$
- Common uses:
  - Finding strongly connected components on a graph
  - Particularly useful for finding source and sink SCCs

---

## Breadth-First Search (BFS) [see also: https://en.wikipedia.org/wiki/Breadth-first_search]

- Input:
  - A simple graph in adjacency list format
  - A starting vertex
- Output:
  - `dist[]` - A list containing the unweighted distance from the starting vertex to the indexed vertex for all vertices in the graph.
    - Unreachable vertices have a distance of $inf$.
  - `prev[]` - A list containing the parent vertex of the indexed vertex, which can be used to create a path from the starting vertex to any reachable vertex.
    - Unreachable vertices and the starting vertex have a parent of `nil`.
- Runtime:
  - $O(n + m)$
- Common uses:
  - Reachability analysis
  - Unweighted shortest path determination
  - Producing a path from starting vertex to a reachable vertex

---

## Dijkstra's (see also: <https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm>)

- Input:
  - A simple graph in adjacency list format
  - A starting vertex
  - A list of non-negative edge weights
- Output:
  - `dist[]` - A list containing the weighted distance from the starting vertex to the indexed vertex for all vertices in the graph.
    - Unreachable vertices have a distance of $inf$.
  - `prev[]` - A list containing the parent vertex of the indexed vertex, which can be used to create a path from the starting vertex to any reachable vertex.
    - Unreachable vertices and the starting vertex have a parent of nil.
- Runtime:
  - $O((n + m) log n)$
- Common uses:
  - Reachability analysis
  - Weighted shortest path determination
  - Producing a path from starting vertex to a reachable vertex

---

Bellman-Ford (BF) [see also: https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm]

- Input:
  - A simple graph in adjacency list format
  - A starting vertex
  - A list of edge weights
- Output:
  - `dist[]` - A list containing the weighted distance from the starting vertex to the indexed vertex for all vertices in the graph.
    - Unreachable vertices have a distance of $inf$.
    - Values are based on the $n-1$ th iteration.
  - `prev[]` - A list containing the parent vertex of the indexed vertex, which can be used to create a path from the starting vertex to any reachable vertex.
    - Unreachable vertices and the starting vertex have a parent of `nil`.
  - `iter[][]` - A 2-dimensional list containing the first indexed iteration's shortest path from the starting vertex to the second indexed vertex.
    - For example, `iter[3][v]` contains the distance from the starting vertex to v at the end of the 3rd iteration.
    - This table contains iterations $0$ through $n$.
- Runtime:
  - $O(nm)$
- Common uses:
  - Reachability analysis
  - Weighted shortest path determination
  - Negative cycle detection
  - Producing a path from starting vertex to a reachable vertex

---

## Floyd-Warshall (FW) [see also: https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm]

- Input:
  - A simple graph in adjacency list format
  - A list of edge weights
- Output:
  - `dist[][]` - A 2-dimensional list containing the weighted distance from the first indexed vertex to the second indexed vertex.
    - For example, `dist[u][v]` would contain the distance of the shortest path from vertex $u$ to vertex $v$.
    - Unreachable vertex pairs have a distance of $inf$.
    - Values are based on the nth iteration.
  - `iter[][][]` - A 3-dimensional list containing the first indexed iteration's shortest path from the second indexed vertex to the third indexed vertex.
    - For example, `iter[3][u][v]` contains the distance from $u$ to $v$ at the end of the 3rd iteration.
    - This table contains iterations $0$ through $n$.
- Runtime:
  - $O(n^3)$
- Common uses:
  - Reachability analysis
  - Weighted shortest path determination
  - Negative cycle detection

---

## Kruskal's (see also: <https://en.wikipedia.org/wiki/Kruskal%27s_algorithm>)

- Input:
  - A simple, connected, undirected graph in adjacency list format
  - A list of edge weights
- Output:
  - `edges[]` - A list of $n-1$ edges that represent a minimum spanning tree for the input graph.
- Runtime:
  - $O(m log n)$
- Common uses:
  - Producing a minimum spanning tree

---

## Prim's (see also: <https://en.wikipedia.org/wiki/Prim%27s_algorithm>)

- Input:
  - A simple, connected, undirected graph in adjacency list format
  - A list of edge weights
- Output:
  - `prev[]` - A list containing the parent vertex of the indexed vertex, which represent the connecting edges of a minimum spanning tree for the input graph.
    - The starting vertex is chosen arbitrarily and has a parent of nil.
- Runtime:
  - $O(m log n)$
- Common uses:
  - Producing a minimum spanning tree

---

## Ford-Fulkerson (FF) [see also: https://en.wikipedia.org/wiki/Ford%E2%80%93Fulkerson_algorithm]

- Input:
  - A simple, connected, directed graph in adjacency list format
  - A list of positive, integer edge capacities
  - A starting source vertex
  - A terminating sink vertex
- Output:
  - `flow[]` - A list of edges representing the amount capacity used per each indexed edge such that the flow is maximized from the starting vertex to the terminating vertex.
  - `C` - The value of the maximum flow from the starting vertex to the terminating vertex.
- Runtime:
  - $O(mC)$
- Common uses:
  - Finding max flows on a graph

---

## Edmonds-Karp (EK) [see also: https://en.wikipedia.org/wiki/Edmonds%E2%80%93Karp_algorithm]

- Input:
  - A simple, connected, directed graph in adjacency list format
  - A list of positive edge capacities
  - A starting source vertex
  - A terminating sink vertex
- Output:
  - `flow[]` - A list of edges representing the amount capacity used per each indexed edge such that the flow is maximized from the starting vertex to the terminating vertex.
  - `C` - The value of the maximum flow from the starting vertex to the terminating vertex.
- Runtime:
  - $O(nm^2)$
- Common uses:
  - Finding max flows on a graph

---

## 2-SAT (see also: <https://en.wikipedia.org/wiki/2-satisfiability>)

- Input:
  - A Boolean formula in conjunctive normal form such that each clause contains at most 2 literals.
    - This formula is backed by a list of $n$ variables, representing at most $2n$ literals and $m$ clauses.
- Output:
  - `assignments[]` - A list indexable by the variables that back the original input formula containing whether that variable is set to true or false.
    - If the input is not satisfiable, this will instead return "NO"
  - All outputs from the Strongly Connected Components (SCC) run are also available to you.
- Runtime:
  - $O(n + m)$
- Common uses:
  - Example of how graphs algorithms can be used to solve a problem that starts in a non-graphs domain
  - Converting a graph representation into a Boolean formula to determine satisfiability of the task at hand
  