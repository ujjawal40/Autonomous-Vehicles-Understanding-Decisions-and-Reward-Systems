"""
London Map Data Handler

Downloads and processes OpenStreetMap data for London navigation.
"""

import os
import pickle
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import numpy as np

try:
    import osmnx as ox
    import networkx as nx
    HAS_OSMNX = True
except ImportError:
    HAS_OSMNX = False
    ox = None
    nx = None


@dataclass
class Intersection:
    """Represents an intersection/node in the road network."""
    id: int
    lat: float
    lon: float
    x: float  # Projected x coordinate
    y: float  # Projected y coordinate
    neighbors: List[int]  # Connected intersection IDs
    street_names: List[str]


@dataclass
class Road:
    """Represents a road segment between two intersections."""
    start_id: int
    end_id: int
    length: float  # meters
    name: str
    speed_limit: float  # m/s
    one_way: bool


class LondonMap:
    """
    Handles London map data from OpenStreetMap.

    Uses a ~1km² area around Soho for the prototype.
    """

    # Soho, London - center point
    CENTER_LAT = 51.5137
    CENTER_LON = -0.1337

    # Area size in meters
    AREA_SIZE = 1000  # 1km x 1km

    CACHE_DIR = Path(__file__).parent / "cache"
    CACHE_FILE = CACHE_DIR / "soho_map.pkl"

    def __init__(self):
        self.graph = None
        self.intersections: Dict[int, Intersection] = {}
        self.roads: List[Road] = []
        self.bounds = None  # (min_x, min_y, max_x, max_y)

    def load_or_download(self) -> bool:
        """Load map from cache or download from OSM."""
        if self.CACHE_FILE.exists():
            return self._load_from_cache()

        if not HAS_OSMNX:
            print("OSMnx not available. Using demo map.")
            return self._create_demo_map()

        return self._download_from_osm()

    def _load_from_cache(self) -> bool:
        """Load cached map data."""
        try:
            with open(self.CACHE_FILE, 'rb') as f:
                data = pickle.load(f)
                self.intersections = data['intersections']
                self.roads = data['roads']
                self.bounds = data['bounds']
            print(f"Loaded {len(self.intersections)} intersections from cache")
            return True
        except Exception as e:
            print(f"Failed to load cache: {e}")
            return self._download_from_osm() if HAS_OSMNX else self._create_demo_map()

    def _download_from_osm(self) -> bool:
        """Download map data from OpenStreetMap."""
        try:
            print("Downloading London (Soho) map data...")

            # Download street network
            G = ox.graph_from_point(
                (self.CENTER_LAT, self.CENTER_LON),
                dist=self.AREA_SIZE // 2,
                network_type='drive',
                simplify=True
            )

            # Project to meters
            G = ox.project_graph(G)
            self.graph = G

            # Extract intersections
            for node_id, data in G.nodes(data=True):
                neighbors = list(G.neighbors(node_id))

                # Get street names from connected edges
                street_names = set()
                for neighbor in neighbors:
                    edge_data = G.get_edge_data(node_id, neighbor)
                    if edge_data:
                        for key in edge_data:
                            name = edge_data[key].get('name', '')
                            if name:
                                if isinstance(name, list):
                                    street_names.update(name)
                                else:
                                    street_names.add(name)

                self.intersections[node_id] = Intersection(
                    id=node_id,
                    lat=data.get('lat', 0),
                    lon=data.get('lon', 0),
                    x=data.get('x', 0),
                    y=data.get('y', 0),
                    neighbors=neighbors,
                    street_names=list(street_names)
                )

            # Extract roads
            for u, v, data in G.edges(data=True):
                name = data.get('name', 'Unknown Road')
                if isinstance(name, list):
                    name = name[0]

                length = data.get('length', 50)
                speed = data.get('maxspeed', '30 mph')

                # Parse speed limit
                if isinstance(speed, str):
                    try:
                        speed = float(speed.split()[0]) * 0.44704  # mph to m/s
                    except:
                        speed = 13.4  # Default 30 mph
                elif isinstance(speed, list):
                    speed = 13.4

                one_way = data.get('oneway', False)

                self.roads.append(Road(
                    start_id=u,
                    end_id=v,
                    length=length,
                    name=name,
                    speed_limit=speed,
                    one_way=one_way
                ))

            # Calculate bounds
            xs = [i.x for i in self.intersections.values()]
            ys = [i.y for i in self.intersections.values()]
            self.bounds = (min(xs), min(ys), max(xs), max(ys))

            # Save to cache
            self._save_to_cache()

            print(f"Downloaded {len(self.intersections)} intersections, {len(self.roads)} road segments")
            return True

        except Exception as e:
            print(f"Failed to download from OSM: {e}")
            return self._create_demo_map()

    def _save_to_cache(self):
        """Save map data to cache."""
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(self.CACHE_FILE, 'wb') as f:
            pickle.dump({
                'intersections': self.intersections,
                'roads': self.roads,
                'bounds': self.bounds
            }, f)

    def _create_demo_map(self) -> bool:
        """Create a demo map for testing without OSM."""
        print("Creating demo London map...")

        # Create a grid-like street network resembling London
        # 6x6 grid with some irregularity
        grid_size = 6
        spacing = 150  # meters between intersections

        node_id = 0
        grid = {}  # (row, col) -> node_id

        for row in range(grid_size):
            for col in range(grid_size):
                # Add some randomness to positions
                x = col * spacing + np.random.uniform(-20, 20)
                y = row * spacing + np.random.uniform(-20, 20)

                grid[(row, col)] = node_id

                self.intersections[node_id] = Intersection(
                    id=node_id,
                    lat=self.CENTER_LAT + (row - grid_size/2) * 0.001,
                    lon=self.CENTER_LON + (col - grid_size/2) * 0.001,
                    x=x,
                    y=y,
                    neighbors=[],
                    street_names=[f"Demo Street {row}-{col}"]
                )
                node_id += 1

        # Connect neighbors
        street_names_h = ["Oxford Street", "Regent Street", "Carnaby Street",
                         "Wardour Street", "Dean Street", "Frith Street"]
        street_names_v = ["Shaftesbury Ave", "Charing Cross Rd", "Greek Street",
                         "Old Compton St", "Brewer Street", "Lexington Street"]

        for row in range(grid_size):
            for col in range(grid_size):
                current_id = grid[(row, col)]
                current = self.intersections[current_id]

                # Connect to right neighbor
                if col < grid_size - 1:
                    right_id = grid[(row, col + 1)]
                    current.neighbors.append(right_id)
                    self.intersections[right_id].neighbors.append(current_id)

                    length = np.sqrt(
                        (self.intersections[right_id].x - current.x)**2 +
                        (self.intersections[right_id].y - current.y)**2
                    )

                    self.roads.append(Road(
                        start_id=current_id,
                        end_id=right_id,
                        length=length,
                        name=street_names_h[row % len(street_names_h)],
                        speed_limit=13.4,  # 30 mph
                        one_way=False
                    ))

                # Connect to bottom neighbor
                if row < grid_size - 1:
                    bottom_id = grid[(row + 1, col)]
                    current.neighbors.append(bottom_id)
                    self.intersections[bottom_id].neighbors.append(current_id)

                    length = np.sqrt(
                        (self.intersections[bottom_id].x - current.x)**2 +
                        (self.intersections[bottom_id].y - current.y)**2
                    )

                    self.roads.append(Road(
                        start_id=current_id,
                        end_id=bottom_id,
                        length=length,
                        name=street_names_v[col % len(street_names_v)],
                        speed_limit=13.4,
                        one_way=False
                    ))

        # Remove some edges to make it more interesting (like London's irregular streets)
        # Remove ~20% of roads randomly
        np.random.seed(42)
        roads_to_remove = np.random.choice(
            len(self.roads),
            size=int(len(self.roads) * 0.2),
            replace=False
        )

        for idx in sorted(roads_to_remove, reverse=True):
            road = self.roads[idx]
            # Remove from neighbor lists
            if road.end_id in self.intersections[road.start_id].neighbors:
                self.intersections[road.start_id].neighbors.remove(road.end_id)
            if road.start_id in self.intersections[road.end_id].neighbors:
                self.intersections[road.end_id].neighbors.remove(road.start_id)
            del self.roads[idx]

        # Calculate bounds
        xs = [i.x for i in self.intersections.values()]
        ys = [i.y for i in self.intersections.values()]
        self.bounds = (min(xs), min(ys), max(xs), max(ys))

        print(f"Created demo map with {len(self.intersections)} intersections, {len(self.roads)} roads")
        return True

    def get_random_start_end(self) -> Tuple[int, int]:
        """Get random start and end intersections that are far apart."""
        ids = list(self.intersections.keys())

        # Try to find points that are reasonably far apart
        best_pair = (ids[0], ids[-1])
        best_dist = 0

        for _ in range(10):
            start_id = np.random.choice(ids)
            end_id = np.random.choice(ids)

            if start_id == end_id:
                continue

            start = self.intersections[start_id]
            end = self.intersections[end_id]

            dist = np.sqrt((end.x - start.x)**2 + (end.y - start.y)**2)

            if dist > best_dist:
                best_dist = dist
                best_pair = (start_id, end_id)

        return best_pair

    def find_shortest_path(self, start_id: int, end_id: int) -> Optional[List[int]]:
        """Find shortest path between two intersections using A*."""
        if start_id not in self.intersections or end_id not in self.intersections:
            return None

        # A* implementation
        import heapq

        def heuristic(node_id):
            node = self.intersections[node_id]
            end = self.intersections[end_id]
            return np.sqrt((end.x - node.x)**2 + (end.y - node.y)**2)

        open_set = [(0, start_id)]
        came_from = {}
        g_score = {start_id: 0}
        f_score = {start_id: heuristic(start_id)}

        while open_set:
            _, current = heapq.heappop(open_set)

            if current == end_id:
                # Reconstruct path
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                return list(reversed(path))

            for neighbor in self.intersections[current].neighbors:
                # Find road length
                road_length = 100  # default
                for road in self.roads:
                    if (road.start_id == current and road.end_id == neighbor) or \
                       (road.start_id == neighbor and road.end_id == current):
                        road_length = road.length
                        break

                tentative_g = g_score[current] + road_length

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score[neighbor] = tentative_g + heuristic(neighbor)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))

        return None  # No path found

    def to_dict(self) -> dict:
        """Convert map to dictionary for JSON serialization."""
        return {
            'intersections': [
                {
                    'id': i.id,
                    'lat': i.lat,
                    'lon': i.lon,
                    'x': float(i.x),
                    'y': float(i.y),
                    'neighbors': i.neighbors,
                    'streetNames': i.street_names
                }
                for i in self.intersections.values()
            ],
            'roads': [
                {
                    'startId': r.start_id,
                    'endId': r.end_id,
                    'length': float(r.length),
                    'name': r.name,
                    'speedLimit': float(r.speed_limit),
                    'oneWay': r.one_way
                }
                for r in self.roads
            ],
            'bounds': {
                'minX': float(self.bounds[0]),
                'minY': float(self.bounds[1]),
                'maxX': float(self.bounds[2]),
                'maxY': float(self.bounds[3])
            } if self.bounds else None,
            'center': {
                'lat': self.CENTER_LAT,
                'lon': self.CENTER_LON
            }
        }
