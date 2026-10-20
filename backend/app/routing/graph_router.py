import heapq
from typing import Dict, List, Tuple, Any

class RoadGraphRouter:
    """
    Dynamic road network graph supporting Dijkstra / A* pathfinding.
    Nodes: Intersections, collection points, depots.
    Dynamic edge cost:
    distance + travel_time + traffic_penalty + flood_penalty + closure_penalty
    """
    def __init__(self):
        # Key nodes in Chennai urban center
        self.nodes = {
            "DEPOT_CENTRAL": (13.0827, 80.2707),
            "NODE_MARINA": (13.0500, 80.2824),
            "NODE_TRIPLICANE": (13.0585, 80.2750),
            "NODE_TNAGAR": (13.0405, 80.2337),
            "NODE_ADYAR": (13.0067, 80.2570),
            "NODE_KOYAMBEDU": (13.0694, 80.1948),
            "NODE_GEORGETOWN": (13.0891, 80.2870),
            "NODE_ANNA_SALAI_JUNCTION": (13.0600, 80.2550),
            "NODE_BEACH_ROAD_JUNCTION": (13.0650, 80.2850),
            "NODE_POONAMALLEE_JUNCTION": (13.0780, 80.2200)
        }
        
        # Base connectivity graph: from_node -> [(to_node, base_dist_km, road_id)]
        self.edges = {
            "DEPOT_CENTRAL": [
                ("NODE_GEORGETOWN", 1.8, "RD-NSC-BOSE"),
                ("NODE_ANNA_SALAI_JUNCTION", 3.2, "RD-ANNA-SALAI"),
                ("NODE_BEACH_ROAD_JUNCTION", 2.6, "RD-KAMARAJAR-SALAI")
            ],
            "NODE_GEORGETOWN": [
                ("DEPOT_CENTRAL", 1.8, "RD-NSC-BOSE"),
                ("NODE_BEACH_ROAD_JUNCTION", 2.2, "RD-KAMARAJAR-SALAI")
            ],
            "NODE_BEACH_ROAD_JUNCTION": [
                ("DEPOT_CENTRAL", 2.6, "RD-KAMARAJAR-SALAI"),
                ("NODE_TRIPLICANE", 1.5, "RD-KAMARAJAR-SALAI"),
                ("NODE_MARINA", 2.0, "RD-KAMARAJAR-SALAI")
            ],
            "NODE_TRIPLICANE": [
                ("NODE_BEACH_ROAD_JUNCTION", 1.5, "RD-KAMARAJAR-SALAI"),
                ("NODE_MARINA", 1.2, "RD-TRIPLICANE-LINK"),
                ("NODE_ANNA_SALAI_JUNCTION", 2.4, "RD-ANNA-LINK")
            ],
            "NODE_MARINA": [
                ("NODE_TRIPLICANE", 1.2, "RD-TRIPLICANE-LINK"),
                ("NODE_BEACH_ROAD_JUNCTION", 2.0, "RD-KAMARAJAR-SALAI"),
                ("NODE_ADYAR", 5.2, "RD-SANTHOME-HIGHWAY")
            ],
            "NODE_ANNA_SALAI_JUNCTION": [
                ("DEPOT_CENTRAL", 3.2, "RD-ANNA-SALAI"),
                ("NODE_TRIPLICANE", 2.4, "RD-ANNA-LINK"),
                ("NODE_TNAGAR", 3.1, "RD-ANNA-SALAI"),
                ("NODE_POONAMALLEE_JUNCTION", 4.0, "RD-INTERMEDIATE")
            ],
            "NODE_TNAGAR": [
                ("NODE_ANNA_SALAI_JUNCTION", 3.1, "RD-ANNA-SALAI"),
                ("NODE_ADYAR", 4.5, "RD-GANDHI-MANDAPAM"),
                ("NODE_KOYAMBEDU", 6.2, "RD-INNER-RING")
            ],
            "NODE_ADYAR": [
                ("NODE_TNAGAR", 4.5, "RD-GANDHI-MANDAPAM"),
                ("NODE_MARINA", 5.2, "RD-SANTHOME-HIGHWAY")
            ],
            "NODE_POONAMALLEE_JUNCTION": [
                ("DEPOT_CENTRAL", 4.8, "RD-POONAMALLEE"),
                ("NODE_KOYAMBEDU", 3.5, "RD-POONAMALLEE"),
                ("NODE_ANNA_SALAI_JUNCTION", 4.0, "RD-INTERMEDIATE")
            ],
            "NODE_KOYAMBEDU": [
                ("NODE_POONAMALLEE_JUNCTION", 3.5, "RD-POONAMALLEE"),
                ("NODE_TNAGAR", 6.2, "RD-INNER-RING")
            ]
        }

    def dijkstra_shortest_path(
        self,
        start_node: str,
        end_node: str,
        traffic_penalties: Dict[str, float] = None,
        flood_penalties: Dict[str, float] = None,
        blocked_roads: List[str] = None
    ) -> Dict[str, Any]:
        """
        Dijkstra pathfinding computing least-cost route incorporating
        traffic, flood risk, and road blocks.
        """
        traffic_penalties = traffic_penalties or {}
        flood_penalties = flood_penalties or {}
        blocked_roads = blocked_roads or []

        pq = [(0.0, start_node, [start_node])]
        visited = {}

        while pq:
            cost, curr, path = heapq.heappop(pq)

            if curr in visited and visited[curr] <= cost:
                continue
            visited[curr] = cost

            if curr == end_node:
                # Convert path to coordinate coordinates
                coords = [self.nodes[n] for n in path]
                return {
                    "path_nodes": path,
                    "total_cost": round(cost, 2),
                    "coordinates": coords,
                    "avoided_congestions": [r for r, p in traffic_penalties.items() if p > 2.0]
                }

            for neighbor, base_dist, road_id in self.edges.get(curr, []):
                if road_id in blocked_roads:
                    continue

                traffic_mult = traffic_penalties.get(road_id, 1.0)
                flood_mult = flood_penalties.get(road_id, 1.0)
                
                # Dynamic cost calculation
                edge_cost = base_dist * traffic_mult * flood_mult
                heapq.heappush(pq, (cost + edge_cost, neighbor, path + [neighbor]))

        return {"path_nodes": [start_node], "total_cost": 999.0, "coordinates": []}

road_graph = RoadGraphRouter()
