import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ZoomIn, ZoomOut, RefreshCw, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface Node {
  id: string;
  type: 'business' | 'owner' | 'location' | 'category';
  name: string;
  properties?: Record<string, any>;
}

export interface Link {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeSelect?: (node: Node) => void;
  onExport?: (format: string) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  onNodeSelect,
  onExport
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const graphRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string | null>(null);
  const [linkTypeFilter, setLinkTypeFilter] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState('graph');

  // Extract node and link types for filters
  const nodeTypes = useMemo(() => {
    return Array.from(new Set(data.nodes.map(node => node.type)));
  }, [data.nodes]);

  const linkTypes = useMemo(() => {
    return Array.from(new Set(data.links.map(link => link.type)));
  }, [data.links]);

  // Filter the data based on search and filters
  const filteredData = useMemo(() => {
    const filteredNodes = data.nodes.filter(node => {
      const matchesSearch = !searchQuery || 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !nodeTypeFilter || node.type === nodeTypeFilter;
      
      return matchesSearch && matchesType;
    });

    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    
    const filteredLinks = data.links.filter(link => {
      const sourceExists = filteredNodeIds.has(link.source);
      const targetExists = filteredNodeIds.has(link.target);
      const matchesType = !linkTypeFilter || link.type === linkTypeFilter;
      
      return sourceExists && targetExists && matchesType;
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, searchQuery, nodeTypeFilter, linkTypeFilter]);

  // Color scale for node types
  const nodeColorScale = d3.scaleOrdinal()
    .domain(['business', 'owner', 'location', 'category'])
    .range(['#4f46e5', '#ec4899', '#06b6d4', '#fbbf24']);

  // Initialize and update the graph
  useEffect(() => {
    if (!svgRef.current || filteredData.nodes.length === 0) return;

    // Clear existing graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom as any);
    
    // Add a group for the graph
    const g = svg.append('g');
    
    // Create the simulation
    const simulation = d3.forceSimulation(filteredData.nodes as any)
      .force('link', d3.forceLink(filteredData.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);

    // Create link labels
    const linkText = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(filteredData.links)
      .enter()
      .append('text')
      .text(d => d.type)
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('fill', '#555')
      .style('pointer-events', 'none')
      .style('visibility', showLabels ? 'visible' : 'hidden');

    // Create node group
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(filteredData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d: any) => d.type === 'business' ? 15 : 10)
      .attr('fill', (d: any) => nodeColorScale(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('click', (event, d: any) => {
        setSelectedNode(d);
        if (onNodeSelect) onNodeSelect(d);
      });

    // Add labels to nodes
    node.append('text')
      .attr('dx', 15)
      .attr('dy', 5)
      .text((d: any) => d.name)
      .attr('font-size', '10px')
      .style('visibility', showLabels ? 'visible' : 'hidden');

    // Add type icons or indicators
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 3)
      .text((d: any) => {
        switch (d.type) {
          case 'business': return 'B';
          case 'owner': return 'O';
          case 'location': return 'L';
          case 'category': return 'C';
          default: return '';
        }
      })
      .attr('font-size', '8px')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    // Update positions in the simulation
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkText
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Save the graph for reference
    graphRef.current = { svg, simulation, zoom };

    // Initial zoom to fit
    zoomToFit();

    return () => {
      simulation.stop();
    };
  }, [filteredData, showLabels, nodeColorScale, onNodeSelect]);

  // Function to zoom to fit the graph
  const zoomToFit = () => {
    if (!svgRef.current || !graphRef.current) return;
    
    const svgElement = svgRef.current;
    const { width, height } = svgElement.getBoundingClientRect();
    
    // Reset zoom
    graphRef.current.svg.transition()
      .duration(750)
      .call(graphRef.current.zoom.transform, d3.zoomIdentity);
    
    setZoomLevel(1);
  };

  // Function to handle zoom in/out
  const handleZoom = (factor: number) => {
    if (!graphRef.current) return;
    
    graphRef.current.svg.transition()
      .duration(300)
      .call(graphRef.current.zoom.scaleBy, factor);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setNodeTypeFilter(null);
    setLinkTypeFilter(null);
  };

  return (
    <div className="flex flex-col space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Knowledge Graph Explorer</CardTitle>
              <CardDescription>Connect businesses, owners, and locations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(value) => onExport && onExport(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Export..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG Image</SelectItem>
                  <SelectItem value="svg">SVG</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => handleZoom(1.2)}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={() => handleZoom(0.8)}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </Button>
              <Button 
                variant="outline"
                size="icon"
                onClick={zoomToFit}
                title="Reset View"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="graph">Graph View</TabsTrigger>
              <TabsTrigger value="details">Node Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="graph" className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select
                  value={nodeTypeFilter || ""}
                  onValueChange={(value) => setNodeTypeFilter(value || null)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Node Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {nodeTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={linkTypeFilter || ""}
                  onValueChange={(value) => setLinkTypeFilter(value || null)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Relation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Relations</SelectItem>
                    {linkTypes.map(type => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="show-labels" className="text-sm">Show Labels</Label>
                  <Switch 
                    id="show-labels" 
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                  className="ml-auto"
                >
                  Reset Filters
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>Nodes: {filteredData.nodes.length}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Connections: {filteredData.links.length}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
                {(nodeTypeFilter || linkTypeFilter || searchQuery) && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Filtered View</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {nodeTypeFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Type: {nodeTypeFilter}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1" 
                      onClick={() => setNodeTypeFilter(null)}
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </Button>
                  </Badge>
                )}
                {linkTypeFilter && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Relation: {linkTypeFilter}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1" 
                      onClick={() => setLinkTypeFilter(null)}
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </Button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {searchQuery}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1" 
                      onClick={() => setSearchQuery('')}
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </Button>
                  </Badge>
                )}
              </div>

              <div className="border rounded-md">
                <div className="flex gap-2 p-2 border-b">
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColorScale('business') }}></div>
                    <span>Business</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColorScale('owner') }}></div>
                    <span>Owner</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColorScale('location') }}></div>
                    <span>Location</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColorScale('category') }}></div>
                    <span>Category</span>
                  </div>
                </div>
                
                <div className="relative bg-muted/30 rounded-b-md overflow-hidden" style={{ height: '600px' }}>
                  {filteredData.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No nodes found matching your criteria
                    </div>
                  ) : (
                    <svg
                      ref={svgRef}
                      width="100%"
                      height="100%"
                      className="overflow-hidden"
                      style={{ backgroundColor: 'transparent' }}
                    />
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              {selectedNode ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: nodeColorScale(selectedNode.type) }}
                      ></div>
                      {selectedNode.name}
                    </CardTitle>
                    <CardDescription>
                      Type: {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} • ID: {selectedNode.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Properties</h3>
                        {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 ? (
                          <div className="border rounded-md divide-y">
                            {Object.entries(selectedNode.properties).map(([key, value]) => (
                              <div key={key} className="flex justify-between p-2">
                                <span className="text-sm font-medium">{key}</span>
                                <span className="text-sm text-muted-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No additional properties</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Connections</h3>
                        <div className="border rounded-md">
                          {filteredData.links.filter(link => 
                            link.source === selectedNode.id || link.target === selectedNode.id
                          ).length > 0 ? (
                            <div className="divide-y">
                              {filteredData.links.filter(link => 
                                link.source === selectedNode.id || link.target === selectedNode.id
                              ).map((link, index) => {
                                const isSource = link.source === selectedNode.id;
                                const connectedNodeId = isSource ? link.target : link.source;
                                const connectedNode = filteredData.nodes.find(n => n.id === connectedNodeId);
                                
                                return (
                                  <div key={index} className="p-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: nodeColorScale(connectedNode?.type || 'business') }}
                                      ></div>
                                      <span className="text-sm">{connectedNode?.name || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-xs text-muted-foreground px-2">
                                        {isSource ? 'has' : 'of'}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {link.type}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground p-2">No connections found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-lg font-semibold mb-2">No Node Selected</div>
                  <p className="text-muted-foreground">
                    Click on a node in the graph view to see its details
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeGraph;