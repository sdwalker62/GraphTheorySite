/**
 * Algorithm reference data: pseudocode and explanations for every implemented algorithm.
 */

export interface AlgorithmReference {
	name: string;
	fullName: string;
	summary: string;
	explanation: string[];
	pseudocode: string;
	complexity: { time: string; space: string };
	useCases: string[];
}

export const algorithmReferences: Record<string, AlgorithmReference> = {
	DFS: {
		name: 'DFS',
		fullName: 'Depth-First Search',
		summary:
			'Explores a graph by going as deep as possible along each branch before backtracking.',
		explanation: [
			'Depth-First Search (DFS) is a fundamental graph traversal algorithm that starts at a chosen source vertex and explores as far as possible along each branch before backtracking.',
			'It uses a stack (or recursion) to keep track of the next vertex to visit. When it reaches a vertex with no unvisited neighbors, it backtracks to the most recent vertex that still has unvisited neighbors.',
			'DFS produces several useful outputs: pre-visit and post-visit orderings (timestamps), a predecessor/parent array for reconstructing paths, and connected component numbers.',
			'The pre/post numbering is especially powerful — it lets you classify edges as tree edges, back edges (indicating cycles), forward edges, or cross edges. If a back edge is found in a directed graph, the graph contains a cycle.',
		],
		pseudocode: `procedure DFS(G, s):
    clock ← 1
    ccnum ← 0
    for all v ∈ V:
        visited[v] ← false
        prev[v] ← nil

    for all v ∈ V (starting from s):
        if not visited[v]:
            ccnum ← ccnum + 1
            Explore(v)

procedure Explore(v):
    visited[v] ← true
    ccnum[v] ← ccnum
    pre[v] ← clock
    clock ← clock + 1
    for all (v, u) ∈ E:
        if not visited[u]:
            prev[u] ← v
            Explore(u)
    post[v] ← clock
    clock ← clock + 1`,
		complexity: { time: 'O(n + m)', space: 'O(n)' },
		useCases: [
			'Finding connected components',
			'Cycle detection',
			'Path finding from source to reachable vertices',
			'Topological sorting (via post-order)',
			'Finding bridges and articulation points',
		],
	},

	'Topological Sort': {
		name: 'Topological Sort',
		fullName: 'Topological Sort (DFS-based)',
		summary:
			'Linearly orders vertices of a DAG so that for every directed edge u→v, u comes before v.',
		explanation: [
			'A topological sort of a directed acyclic graph (DAG) is a linear ordering of its vertices such that for every directed edge (u, v), vertex u appears before vertex v in the ordering.',
			'The DFS-based approach works by running a full DFS on the graph and recording vertices in reverse post-order. When DFS finishes exploring a vertex (all its descendants are fully processed), it is pushed onto a stack. The final order is obtained by popping all vertices off the stack.',
			'This works because a vertex\'s post-visit number is always greater than the post-visit numbers of all vertices reachable from it. Sorting by decreasing post-order therefore gives a valid topological ordering.',
			'Note: A topological sort only exists for DAGs. If the graph contains a cycle, no valid topological ordering exists.',
		],
		pseudocode: `procedure TopologicalSort(G):
    Run DFS(G) to compute post[v] for all v
    order ← vertices sorted by decreasing post[v]
    return order

// Equivalently using a stack:
procedure TopologicalSort(G):
    for all v ∈ V:
        visited[v] ← false
    stack ← empty

    for all v ∈ V:
        if not visited[v]:
            TopoExplore(v)

    return stack (top to bottom)

procedure TopoExplore(v):
    visited[v] ← true
    for all (v, u) ∈ E:
        if not visited[u]:
            TopoExplore(u)
    stack.push(v)    // add after all descendants`,
		complexity: { time: 'O(n + m)', space: 'O(n)' },
		useCases: [
			'Task scheduling with dependencies',
			'Build systems and compilation order',
			'Course prerequisite planning',
			'Data serialization',
		],
	},

	SCC: {
		name: 'SCC',
		fullName: "Kosaraju's Strongly Connected Components",
		summary:
			'Finds all maximal sets of vertices where every vertex is reachable from every other vertex in the set.',
		explanation: [
			'A Strongly Connected Component (SCC) of a directed graph is a maximal set of vertices such that there is a directed path from every vertex to every other vertex within the set.',
			"Kosaraju's algorithm finds all SCCs using two passes of DFS. First, it runs DFS on the original graph and records the post-order of each vertex. Then, it creates the reverse graph (all edges flipped) and runs DFS on the reverse graph, processing vertices in decreasing order of their post-visit numbers from the first pass.",
			'Each DFS tree in the second pass corresponds to exactly one SCC. The algorithm works because processing in reverse post-order ensures that the second DFS cannot "escape" through edges into previously visited SCCs.',
			'The resulting SCC metagraph (condensation) — where each SCC is collapsed into a single super-vertex — is always a DAG. The SCCs are numbered in reverse topological order of this metagraph.',
		],
		pseudocode: `procedure SCC(G):
    // Pass 1: DFS on original graph
    Run DFS(G)
    Let order ← vertices sorted by decreasing post[v]

    // Pass 2: DFS on reverse graph
    G_R ← reverse all edges of G
    ccnum ← 0
    for all v ∈ V:
        visited[v] ← false

    for v in order:
        if not visited[v]:
            ccnum ← ccnum + 1
            Explore(G_R, v)    // assigns ccnum[v]

    return ccnum[]    // SCC assignment`,
		complexity: { time: 'O(n + m)', space: 'O(n + m)' },
		useCases: [
			'Finding strongly connected components',
			'2-SAT problem solving',
			'Detecting mutual dependencies',
			'Simplifying directed graphs via condensation',
		],
	},

	BFS: {
		name: 'BFS',
		fullName: 'Breadth-First Search',
		summary:
			'Explores a graph level by level, visiting all neighbors at the current depth before moving deeper.',
		explanation: [
			'Breadth-First Search (BFS) is a graph traversal algorithm that explores vertices in order of their distance from the source. It visits all vertices at distance 1 first, then distance 2, and so on.',
			'BFS uses a queue (FIFO) data structure. The source vertex is enqueued first. At each step, the front vertex is dequeued, and all its unvisited neighbors are enqueued.',
			'BFS naturally computes shortest paths in unweighted graphs — the dist[] array gives the minimum number of edges to reach each vertex from the source. It also produces a predecessor array for reconstructing these shortest paths.',
			'Unlike DFS, BFS is guaranteed to find the shortest path (fewest edges) in an unweighted graph. This makes it ideal for problems where hop count matters.',
		],
		pseudocode: `procedure BFS(G, s):
    for all v ∈ V:
        dist[v] ← ∞
        prev[v] ← nil
    dist[s] ← 0
    Q ← queue containing s

    while Q is not empty:
        u ← Q.dequeue()
        for all (u, v) ∈ E:
            if dist[v] = ∞:
                dist[v] ← dist[u] + 1
                prev[v] ← u
                Q.enqueue(v)

    return dist[], prev[]`,
		complexity: { time: 'O(n + m)', space: 'O(n)' },
		useCases: [
			'Shortest path in unweighted graphs',
			'Level-order traversal',
			'Finding connected components',
			'Web crawling and social network analysis',
		],
	},

	"Dijkstra's": {
		name: "Dijkstra's",
		fullName: "Dijkstra's Shortest Path Algorithm",
		summary:
			'Finds the shortest path from a source vertex to all other vertices in a graph with non-negative edge weights.',
		explanation: [
			"Dijkstra's algorithm is a greedy algorithm that finds the shortest weighted path from a source vertex to every other vertex in a graph with non-negative edge weights.",
			'It maintains a priority queue (min-heap) of vertices ordered by their tentative distance from the source. At each step, it extracts the vertex with the smallest tentative distance, marks it as finalized, and relaxes all its outgoing edges — updating neighbors if a shorter path is found through the current vertex.',
			'The key insight is that once a vertex is extracted from the priority queue, its shortest distance is finalized and will never change. This greedy property holds only when all edge weights are non-negative.',
			'For graphs with negative edge weights, Dijkstra\'s algorithm may produce incorrect results. Use Bellman-Ford instead for graphs that may have negative weights.',
		],
		pseudocode: `procedure Dijkstra(G, s, w):
    for all v ∈ V:
        dist[v] ← ∞
        prev[v] ← nil
    dist[s] ← 0
    H ← priority queue of V using dist[] as key

    while H is not empty:
        u ← H.extractMin()
        for all (u, v) ∈ E:
            if dist[v] > dist[u] + w(u, v):
                dist[v] ← dist[u] + w(u, v)
                prev[v] ← u
                H.decreaseKey(v, dist[v])

    return dist[], prev[]`,
		complexity: { time: 'O((n + m) log n)', space: 'O(n)' },
		useCases: [
			'GPS and navigation systems',
			'Network routing protocols (OSPF)',
			'Shortest path with non-negative weights',
			'As a subroutine in other algorithms (e.g., A*)',
		],
	},

	'Bellman-Ford': {
		name: 'Bellman-Ford',
		fullName: 'Bellman-Ford Shortest Path Algorithm',
		summary:
			'Finds shortest paths from a source vertex, handling negative edge weights and detecting negative cycles.',
		explanation: [
			'The Bellman-Ford algorithm computes shortest paths from a single source vertex to all other vertices, even when edges have negative weights.',
			'It works by performing n−1 relaxation passes over all edges. In each pass, it checks every edge (u, v) and updates dist[v] if a shorter path through u is found. After n−1 passes, all shortest distances are finalized (assuming no negative cycles).',
			'A key feature is negative cycle detection: after the n−1 passes, a final (nth) pass is performed. If any distance can still be reduced, the graph contains a negative-weight cycle reachable from the source.',
			'Bellman-Ford is slower than Dijkstra\'s but more versatile — it correctly handles negative edges and can detect negative cycles, which Dijkstra\'s cannot.',
		],
		pseudocode: `procedure BellmanFord(G, s, w):
    for all v ∈ V:
        dist[v] ← ∞
        prev[v] ← nil
    dist[s] ← 0

    // Relax all edges n-1 times
    for i ← 1 to n - 1:
        for all (u, v) ∈ E:
            if dist[v] > dist[u] + w(u, v):
                dist[v] ← dist[u] + w(u, v)
                prev[v] ← u

    // Check for negative cycles (nth pass)
    for all (u, v) ∈ E:
        if dist[v] > dist[u] + w(u, v):
            return "Negative cycle detected"

    return dist[], prev[]`,
		complexity: { time: 'O(nm)', space: 'O(n)' },
		useCases: [
			'Shortest paths with negative edge weights',
			'Negative cycle detection',
			'Currency arbitrage detection',
			'Distance-vector routing protocols (RIP)',
		],
	},

	'Floyd-Warshall': {
		name: 'Floyd-Warshall',
		fullName: 'Floyd-Warshall All-Pairs Shortest Paths',
		summary:
			'Computes shortest paths between every pair of vertices using dynamic programming.',
		explanation: [
			'The Floyd-Warshall algorithm computes shortest paths between all pairs of vertices simultaneously using dynamic programming.',
			'The key idea is iterating over intermediate vertices: in iteration k, it considers whether the shortest path from i to j can be improved by routing through vertex k. The recurrence is: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).',
			'The algorithm uses a 3D concept (iteration × source × destination) but can be implemented in-place with a 2D matrix because the order of updates within each iteration does not matter.',
			'Like Bellman-Ford, it handles negative edge weights. A negative cycle exists if any diagonal entry dist[v][v] becomes negative after the algorithm completes.',
		],
		pseudocode: `procedure FloydWarshall(G, w):
    // Initialize distance matrix
    for all i, j ∈ V:
        if i = j:
            dist[i][j] ← 0
        else if (i, j) ∈ E:
            dist[i][j] ← w(i, j)
        else:
            dist[i][j] ← ∞

    // Main DP loop
    for k ← 1 to n:        // intermediate vertex
        for i ← 1 to n:    // source
            for j ← 1 to n:  // destination
                if dist[i][j] > dist[i][k] + dist[k][j]:
                    dist[i][j] ← dist[i][k] + dist[k][j]

    return dist[][]`,
		complexity: { time: 'O(n³)', space: 'O(n²)' },
		useCases: [
			'All-pairs shortest paths',
			'Transitive closure of a graph',
			'Negative cycle detection',
			'Network analysis and distance matrices',
		],
	},

	"Kruskal's": {
		name: "Kruskal's",
		fullName: "Kruskal's Minimum Spanning Tree",
		summary:
			'Builds a minimum spanning tree by greedily adding the cheapest edge that does not form a cycle.',
		explanation: [
			"Kruskal's algorithm finds a minimum spanning tree (MST) of a connected, undirected, weighted graph. An MST connects all vertices with the minimum total edge weight and no cycles.",
			'The algorithm works by sorting all edges by weight in non-decreasing order, then greedily adding each edge to the tree as long as it does not create a cycle. After n−1 edges are added, the MST is complete.',
			'Cycle detection is efficiently handled using a Union-Find (Disjoint Set Union) data structure. Two vertices are in the same component if they share the same root in the Union-Find structure. An edge is safe to add only if its endpoints are in different components.',
			'Union-Find with path compression and union by rank achieves nearly O(1) amortized time per operation, making the overall algorithm dominated by the sorting step.',
		],
		pseudocode: `procedure Kruskal(G, w):
    Sort edges E by weight w in non-decreasing order
    T ← ∅     // MST edges
    Initialize Union-Find for each v ∈ V:
        MakeSet(v)

    for each (u, v) ∈ E (in sorted order):
        if Find(u) ≠ Find(v):
            T ← T ∪ {(u, v)}
            Union(u, v)

    return T

// Union-Find operations:
procedure MakeSet(x):
    parent[x] ← x; rank[x] ← 0

procedure Find(x):     // with path compression
    if parent[x] ≠ x:
        parent[x] ← Find(parent[x])
    return parent[x]

procedure Union(x, y):  // by rank
    rx ← Find(x); ry ← Find(y)
    if rank[rx] > rank[ry]: parent[ry] ← rx
    else if rank[rx] < rank[ry]: parent[rx] ← ry
    else: parent[ry] ← rx; rank[rx]++`,
		complexity: { time: 'O(m log n)', space: 'O(n + m)' },
		useCases: [
			'Network design (minimum cost wiring)',
			'Cluster analysis',
			'Approximation algorithms for NP-hard problems',
			'Image segmentation',
		],
	},

	"Prim's": {
		name: "Prim's",
		fullName: "Prim's Minimum Spanning Tree",
		summary:
			'Grows an MST from a starting vertex by always adding the cheapest edge connecting the tree to a non-tree vertex.',
		explanation: [
			"Prim's algorithm builds a minimum spanning tree by starting from an arbitrary vertex and growing the tree one edge at a time.",
			'At each step, it selects the lightest edge connecting a vertex already in the MST to a vertex not yet in the MST. This is the "cut property" — the lightest edge crossing any cut of the graph is always safe to include in the MST.',
			'Implementation uses a priority queue (min-heap) keyed by the minimum edge weight connecting each non-tree vertex to the current tree. When a vertex is extracted, its connecting edge is added to the MST, and its neighbors\' keys are updated if a cheaper connection is found.',
			"Prim's is similar to Dijkstra's in structure but differs in what the priority key represents: Dijkstra's uses total distance from source, while Prim's uses the weight of the single connecting edge.",
		],
		pseudocode: `procedure Prim(G, w):
    for all v ∈ V:
        cost[v] ← ∞
        prev[v] ← nil
    Pick any starting vertex s
    cost[s] ← 0
    H ← priority queue of V using cost[] as key

    while H is not empty:
        u ← H.extractMin()
        for all (u, v) ∈ E:
            if v ∈ H and w(u, v) < cost[v]:
                cost[v] ← w(u, v)
                prev[v] ← u
                H.decreaseKey(v, cost[v])

    return prev[]   // MST edges: (prev[v], v)`,
		complexity: { time: 'O((n + m) log n)', space: 'O(n)' },
		useCases: [
			'Network design (minimum cost wiring)',
			'Efficient for dense graphs',
			'Maze generation',
			'Approximation for Steiner tree problems',
		],
	},

	'Ford-Fulkerson': {
		name: 'Ford-Fulkerson',
		fullName: 'Ford-Fulkerson Maximum Flow (DFS)',
		summary:
			'Finds the maximum flow from a source to a sink by repeatedly finding augmenting paths via DFS.',
		explanation: [
			'The Ford-Fulkerson method computes the maximum flow in a flow network — a directed graph where each edge has a capacity, and flow must respect capacity constraints and conservation (flow in = flow out at every non-source/sink vertex).',
			'It works by repeatedly finding an augmenting path from source to sink in the residual graph using DFS. The residual graph includes forward edges (with remaining capacity) and backward edges (allowing flow to be "undone").',
			'For each augmenting path found, the bottleneck (minimum residual capacity along the path) is pushed as additional flow. This updates both the flow and the residual graph. The process repeats until no augmenting path exists.',
			'By the Max-Flow Min-Cut Theorem, the maximum flow equals the minimum cut capacity — the smallest total capacity of edges whose removal disconnects source from sink. The final residual graph reveals this min-cut.',
		],
		pseudocode: `procedure FordFulkerson(G, s, t, cap):
    Initialize flow f(e) ← 0 for all e ∈ E
    Build residual graph G_f

    while ∃ augmenting path P from s to t in G_f:
        // Find path using DFS
        P ← DFS(G_f, s, t)

        // Compute bottleneck
        b ← min{ residual(e) : e ∈ P }

        // Augment flow along path
        for each edge (u, v) ∈ P:
            if (u, v) is a forward edge:
                f(u, v) ← f(u, v) + b
            else:  // backward edge
                f(v, u) ← f(v, u) - b

        Update residual graph G_f

    return f, total flow`,
		complexity: { time: 'O(mC) where C = max flow value', space: 'O(n + m)' },
		useCases: [
			'Maximum flow in networks',
			'Bipartite matching',
			'Minimum cut problems',
			'Network reliability analysis',
		],
	},

	'Edmonds-Karp': {
		name: 'Edmonds-Karp',
		fullName: 'Edmonds-Karp Maximum Flow (BFS)',
		summary:
			'A BFS-based refinement of Ford-Fulkerson that guarantees polynomial runtime by using shortest augmenting paths.',
		explanation: [
			'The Edmonds-Karp algorithm is a specific implementation of the Ford-Fulkerson method that uses BFS instead of DFS to find augmenting paths. This seemingly small change provides a crucial guarantee: the algorithm runs in polynomial time regardless of the capacity values.',
			'By using BFS, each augmenting path is a shortest path (fewest edges) from source to sink in the residual graph. This ensures that the length of the shortest augmenting path never decreases between iterations.',
			'It can be shown that the shortest path distance from source to any vertex in the residual graph monotonically increases. Since the distance is bounded by n, and each distance level can produce at most m augmenting paths, the total number of augmentations is O(nm).',
			'Edmonds-Karp is preferred over basic Ford-Fulkerson when edge capacities are large or non-integer, since Ford-Fulkerson\'s O(mC) runtime can be impractical with large capacity values.',
		],
		pseudocode: `procedure EdmondsKarp(G, s, t, cap):
    Initialize flow f(e) ← 0 for all e ∈ E
    Build residual graph G_f

    while ∃ augmenting path P from s to t in G_f:
        // Find SHORTEST path using BFS
        P ← BFS(G_f, s, t)

        // Compute bottleneck
        b ← min{ residual(e) : e ∈ P }

        // Augment flow along path
        for each edge (u, v) ∈ P:
            if (u, v) is a forward edge:
                f(u, v) ← f(u, v) + b
            else:
                f(v, u) ← f(v, u) - b

        Update residual graph G_f

    return f, total flow`,
		complexity: { time: 'O(nm²)', space: 'O(n + m)' },
		useCases: [
			'Maximum flow with guaranteed polynomial runtime',
			'Bipartite matching',
			'Preferred for large or real-valued capacities',
			'Network optimization',
		],
	},
};
