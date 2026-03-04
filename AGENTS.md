# Agents

- This is a svelte based site which will be deployed on Netlify.
- Use the DaisyUI as the UI component library.
- The site should have a light and dark mode.
- The purpose of the site is to help people study graph algorithms like Depth First Search, etc. The list of algorithms can be found in `Graph_Theory_Algorithms.md`.
- There should be a configuration pane on the right that allows the user to select graph properties: directed/un-directed, contains cycles, edge_weights/unweighted, number of vertices.
- Graphs should be simple in that if they:
  - Contain no multi-edges or self-loops
  - Can be connected or disconnected, undirected or directed, sparse or dense
- The pane on the left should allow users to select from the available algorithms.
- Cap the number of vertices to 100 to avoid computational overload.
- There should be an iteration slider at the bottom that allows users to:
  - granularly control each step of the algorithm
  - play the algorithms progress from start to finish
