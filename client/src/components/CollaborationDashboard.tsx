import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MessageSquare, Users, BookOpen, BrainCircuit, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  agent_id: string;
  name: string;
  capabilities: string[];
  registered_at: string;
  last_active: string;
}

interface Team {
  team_id: string;
  name: string;
  description: string;
  coordinator_id: string;
  members: TeamMember[];
  active_tasks: TeamTask[];
}

interface TeamMember {
  agent_id: string;
  role: string;
  joined_at: string;
}

interface TeamTask {
  task_id: string;
  task_type: string;
  coordinator_id: string;
  assigned_at: string;
  deadline: string | null;
  assignments: string[];
  status: string;
}

interface Message {
  message_id: string;
  message_type: string;
  sender_id: string;
  receiver_id: string;
  content: any;
  priority: string;
  created_at: string;
  delivered: boolean;
  read: boolean;
  processed: boolean;
}

interface KnowledgeItem {
  item_id: string;
  content: any;
  source_agent_id: string;
  category: string;
  confidence: number;
  tags: string[];
  created_at: string;
}

const CollaborationDashboard: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New agent form
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentCapabilities, setNewAgentCapabilities] = useState('');
  
  // New team form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamCoordinator, setNewTeamCoordinator] = useState('');
  
  // New message form
  const [messageSender, setMessageSender] = useState('');
  const [messageReceiver, setMessageReceiver] = useState('');
  const [messageType, setMessageType] = useState('knowledge_share');
  const [messageContent, setMessageContent] = useState('');
  const [messagePriority, setMessagePriority] = useState('medium');
  
  // New knowledge form
  const [knowledgeAgent, setKnowledgeAgent] = useState('');
  const [knowledgeCategory, setKnowledgeCategory] = useState('general');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [knowledgeTags, setKnowledgeTags] = useState('');

  useEffect(() => {
    // Load initial data
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      } else {
        console.error('Error fetching agents:', await response.text());
        toast({
          title: "Error",
          description: "Failed to fetch agents",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        console.error('Error fetching teams:', await response.text());
        toast({
          title: "Error",
          description: "Failed to fetch teams",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (agentId: string = 'all') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/collaboration/messages/${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Error fetching messages:', await response.text());
        toast({
          title: "Error",
          description: "Failed to fetch messages",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/knowledge');
      if (response.ok) {
        const data = await response.json();
        setKnowledge(data.knowledge || []);
      } else {
        console.error('Error fetching knowledge:', await response.text());
        toast({
          title: "Error",
          description: "Failed to fetch knowledge items",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching knowledge:', error);
      toast({
        title: "Error",
        description: "Failed to connect to the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Load data for the selected tab
    if (value === 'agents' && agents.length === 0) {
      fetchAgents();
    } else if (value === 'teams' && teams.length === 0) {
      fetchTeams();
    } else if (value === 'messages' && messages.length === 0) {
      fetchMessages('all');
    } else if (value === 'knowledge' && knowledge.length === 0) {
      fetchKnowledge();
    }
  };

  const handleRegisterAgent = async () => {
    if (!newAgentName.trim()) {
      toast({
        title: "Error",
        description: "Agent name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Parse capabilities
      const capabilities = newAgentCapabilities
        .split(',')
        .map(capability => capability.trim())
        .filter(capability => capability.length > 0);
      
      // Call the API to register the agent
      const response = await fetch('/api/collaboration/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newAgentName,
          capabilities
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.agent) {
          // Add the new agent to the state
          setAgents([...agents, data.agent]);
          
          // Reset form
          setNewAgentName('');
          setNewAgentCapabilities('');
          
          toast({
            title: "Success",
            description: `Agent ${data.agent.name} registered successfully`,
          });
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const errorText = await response.text();
        console.error('Error registering agent:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error registering agent:', error);
      toast({
        title: "Error",
        description: "Failed to register agent",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Call the API to create the team
      const response = await fetch('/api/collaboration/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          coordinator_id: newTeamCoordinator
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.team) {
          // Add the new team to the state
          setTeams([...teams, data.team]);
          
          // Reset form
          setNewTeamName('');
          setNewTeamDescription('');
          setNewTeamCoordinator('');
          
          toast({
            title: "Success",
            description: `Team ${data.team.name} created successfully`,
          });
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const errorText = await response.text();
        console.error('Error creating team:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSender.trim() || !messageReceiver.trim() || !messageContent.trim()) {
      toast({
        title: "Error",
        description: "Sender, receiver, and content are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Call the API to send the message
      const response = await fetch('/api/collaboration/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_type: messageType,
          sender_id: messageSender,
          receiver_id: messageReceiver,
          content: { text: messageContent },
          priority: messagePriority
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.message) {
          // Add the new message to the state
          setMessages([...messages, data.message]);
          
          // Reset form
          setMessageContent('');
          
          toast({
            title: "Success",
            description: "Message sent successfully",
          });
          
          // Refresh messages list for the current receiver
          fetchMessages(messageReceiver);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const errorText = await response.text();
        console.error('Error sending message:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!knowledgeAgent.trim() || !knowledgeCategory.trim() || !knowledgeContent.trim()) {
      toast({
        title: "Error",
        description: "Agent, category, and content are required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Parse tags
      const tags = knowledgeTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Call the API to add knowledge
      const response = await fetch('/api/collaboration/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { text: knowledgeContent },
          source_agent_id: knowledgeAgent,
          category: knowledgeCategory,
          confidence: parseFloat(knowledgeConfidence) || 1.0,
          tags
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.knowledge_item) {
          // Add the new knowledge item to the state
          setKnowledge([...knowledge, data.knowledge_item]);
          
          // Reset form
          setKnowledgeContent('');
          setKnowledgeTags('');
          
          toast({
            title: "Success",
            description: "Knowledge added successfully",
          });
          
          // Refresh knowledge list
          fetchKnowledge();
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const errorText = await response.text();
        console.error('Error adding knowledge:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error adding knowledge:', error);
      toast({
        title: "Error",
        description: "Failed to add knowledge",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Agent Collaboration Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Knowledge
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Register New Agent</CardTitle>
              <CardDescription>Add a new agent to the collaboration system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="agent-name" className="text-sm font-medium">
                  Agent Name
                </label>
                <Input 
                  id="agent-name" 
                  value={newAgentName} 
                  onChange={(e) => setNewAgentName(e.target.value)} 
                  placeholder="Enter agent name"
                />
              </div>
              <div>
                <label htmlFor="agent-capabilities" className="text-sm font-medium">
                  Capabilities (comma separated)
                </label>
                <Input 
                  id="agent-capabilities" 
                  value={newAgentCapabilities} 
                  onChange={(e) => setNewAgentCapabilities(e.target.value)} 
                  placeholder="e.g., research, planning, analysis"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleRegisterAgent} disabled={loading}>
                Register Agent
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Registered Agents</CardTitle>
              <CardDescription>All agents in the collaboration system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agents registered yet.</p>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.agent_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-xs text-muted-foreground">ID: {agent.agent_id}</p>
                        </div>
                        <div className="text-xs text-right">
                          <p>Registered: {new Date(agent.registered_at).toLocaleDateString()}</p>
                          <p>Last Active: {new Date(agent.last_active).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary">{capability}</Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Team</CardTitle>
              <CardDescription>Form a team of agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="team-name" className="text-sm font-medium">
                  Team Name
                </label>
                <Input 
                  id="team-name" 
                  value={newTeamName} 
                  onChange={(e) => setNewTeamName(e.target.value)} 
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label htmlFor="team-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea 
                  id="team-description" 
                  value={newTeamDescription} 
                  onChange={(e) => setNewTeamDescription(e.target.value)} 
                  placeholder="Enter team description"
                />
              </div>
              <div>
                <label htmlFor="team-coordinator" className="text-sm font-medium">
                  Coordinator
                </label>
                <Select value={newTeamCoordinator} onValueChange={setNewTeamCoordinator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select coordinator" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.agent_id} value={agent.agent_id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateTeam} disabled={loading}>
                Create Team
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Active agent teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams created yet.</p>
                ) : (
                  teams.map((team) => (
                    <div key={team.team_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{team.name}</h3>
                          <p className="text-sm">{team.description}</p>
                        </div>
                        <div className="text-xs">
                          <p>Members: {team.members.length}</p>
                          <p>Tasks: {team.active_tasks.length}</p>
                        </div>
                      </div>
                      {team.members.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-semibold">Members</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.members.map((member) => {
                              const agent = agents.find(a => a.agent_id === member.agent_id);
                              return (
                                <Badge key={member.agent_id} variant="outline">
                                  {agent?.name || member.agent_id} ({member.role})
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Send a message between agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="message-sender" className="text-sm font-medium">
                    Sender
                  </label>
                  <Select value={messageSender} onValueChange={setMessageSender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sender" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="message-receiver" className="text-sm font-medium">
                    Receiver
                  </label>
                  <Select value={messageReceiver} onValueChange={setMessageReceiver}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select receiver" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="message-type" className="text-sm font-medium">
                    Message Type
                  </label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task_request">Task Request</SelectItem>
                      <SelectItem value="task_response">Task Response</SelectItem>
                      <SelectItem value="knowledge_share">Knowledge Share</SelectItem>
                      <SelectItem value="knowledge_request">Knowledge Request</SelectItem>
                      <SelectItem value="status_update">Status Update</SelectItem>
                      <SelectItem value="coordination">Coordination</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="message-priority" className="text-sm font-medium">
                    Priority
                  </label>
                  <Select value={messagePriority} onValueChange={setMessagePriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label htmlFor="message-content" className="text-sm font-medium">
                  Content
                </label>
                <Textarea 
                  id="message-content" 
                  value={messageContent} 
                  onChange={(e) => setMessageContent(e.target.value)} 
                  placeholder="Enter message content"
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSendMessage} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communication between agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((message) => {
                    const sender = agents.find(a => a.agent_id === message.sender_id);
                    const receiver = agents.find(a => a.agent_id === message.receiver_id);
                    
                    return (
                      <div key={message.message_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{sender?.name || message.sender_id}</h3>
                              <span className="text-sm text-muted-foreground">→</span>
                              <h3 className="font-semibold">{receiver?.name || message.receiver_id}</h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge>{message.message_type.replace('_', ' ')}</Badge>
                              <Badge variant={
                                message.priority === 'critical' ? 'destructive' :
                                message.priority === 'high' ? 'default' :
                                message.priority === 'medium' ? 'secondary' : 'outline'
                              }>
                                {message.priority}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-right">
                            <p>{new Date(message.created_at).toLocaleString()}</p>
                            <p>
                              Status: {
                                message.processed ? 'Processed' :
                                message.read ? 'Read' :
                                message.delivered ? 'Delivered' : 'Sent'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <p>{message.content.text || JSON.stringify(message.content)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="knowledge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Knowledge</CardTitle>
              <CardDescription>Add knowledge to the shared knowledge base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="knowledge-agent" className="text-sm font-medium">
                  Source Agent
                </label>
                <Select value={knowledgeAgent} onValueChange={setKnowledgeAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.agent_id} value={agent.agent_id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="knowledge-category" className="text-sm font-medium">
                  Category
                </label>
                <Select value={knowledgeCategory} onValueChange={setKnowledgeCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="procedural">Procedural</SelectItem>
                    <SelectItem value="factual">Factual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="knowledge-content" className="text-sm font-medium">
                  Content
                </label>
                <Textarea 
                  id="knowledge-content" 
                  value={knowledgeContent} 
                  onChange={(e) => setKnowledgeContent(e.target.value)} 
                  placeholder="Enter knowledge content"
                  rows={4}
                />
              </div>
              <div>
                <label htmlFor="knowledge-tags" className="text-sm font-medium">
                  Tags (comma separated)
                </label>
                <Input 
                  id="knowledge-tags" 
                  value={knowledgeTags} 
                  onChange={(e) => setKnowledgeTags(e.target.value)} 
                  placeholder="e.g., important, reference, work-in-progress"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddKnowledge} disabled={loading}>
                Add Knowledge
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Shared knowledge between agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {knowledge.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No knowledge items yet.</p>
                ) : (
                  knowledge.map((item) => {
                    const agent = agents.find(a => a.agent_id === item.source_agent_id);
                    
                    return (
                      <div key={item.item_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.category}</Badge>
                              <span className="text-xs text-muted-foreground">from</span>
                              <span className="font-semibold">{agent?.name || item.source_agent_id}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs">
                            <p>{new Date(item.created_at).toLocaleDateString()}</p>
                            <p>Confidence: {(item.confidence * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <p>{item.content.text || JSON.stringify(item.content)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Sample data for demo purposes
const sampleAgents: Agent[] = [
  {
    agent_id: "research_agent",
    name: "Research Agent",
    capabilities: ["research", "data_collection", "analysis"],
    registered_at: "2025-05-01T10:00:00Z",
    last_active: "2025-05-08T09:30:00Z"
  },
  {
    agent_id: "planning_agent",
    name: "Planning Agent",
    capabilities: ["planning", "scheduling", "coordination"],
    registered_at: "2025-05-02T14:30:00Z",
    last_active: "2025-05-08T10:15:00Z"
  },
  {
    agent_id: "development_agent",
    name: "Development Agent",
    capabilities: ["coding", "testing", "debugging"],
    registered_at: "2025-05-03T09:45:00Z",
    last_active: "2025-05-08T08:20:00Z"
  },
  {
    agent_id: "creative_agent",
    name: "Creative Agent",
    capabilities: ["design", "content_creation", "ideation"],
    registered_at: "2025-05-04T11:20:00Z",
    last_active: "2025-05-07T16:40:00Z"
  }
];

const sampleTeams: Team[] = [
  {
    team_id: "research_team",
    name: "Research Team",
    description: "Team focused on research and data collection",
    coordinator_id: "planning_agent",
    members: [
      {
        agent_id: "research_agent",
        role: "researcher",
        joined_at: "2025-05-05T10:30:00Z"
      },
      {
        agent_id: "development_agent",
        role: "data_analyst",
        joined_at: "2025-05-05T11:15:00Z"
      }
    ],
    active_tasks: [
      {
        task_id: "task_1",
        task_type: "market_research",
        coordinator_id: "planning_agent",
        assigned_at: "2025-05-06T09:00:00Z",
        deadline: "2025-05-10T17:00:00Z",
        assignments: ["research_agent", "development_agent"],
        status: "in_progress"
      }
    ]
  },
  {
    team_id: "development_team",
    name: "Development Team",
    description: "Team focused on development and implementation",
    coordinator_id: "planning_agent",
    members: [
      {
        agent_id: "development_agent",
        role: "lead_developer",
        joined_at: "2025-05-05T14:00:00Z"
      },
      {
        agent_id: "creative_agent",
        role: "ui_designer",
        joined_at: "2025-05-05T14:30:00Z"
      }
    ],
    active_tasks: []
  }
];

const sampleMessages: Message[] = [
  {
    message_id: "msg_1",
    message_type: "task_request",
    sender_id: "planning_agent",
    receiver_id: "research_agent",
    content: {
      text: "Please conduct market research on AI productivity tools. Focus on usage patterns and key features that drive user engagement."
    },
    priority: "high",
    created_at: "2025-05-07T10:30:00Z",
    delivered: true,
    read: true,
    processed: false
  },
  {
    message_id: "msg_2",
    message_type: "knowledge_share",
    sender_id: "research_agent",
    receiver_id: "planning_agent",
    content: {
      text: "I've completed the preliminary analysis of AI tools in the productivity space. Key finding: 78% of users prioritize integration with existing workflows over advanced features."
    },
    priority: "medium",
    created_at: "2025-05-07T14:45:00Z",
    delivered: true,
    read: true,
    processed: true
  },
  {
    message_id: "msg_3",
    message_type: "coordination",
    sender_id: "planning_agent",
    receiver_id: "development_agent",
    content: {
      text: "Based on research findings, we should prioritize API integrations with common productivity tools in the next sprint."
    },
    priority: "medium",
    created_at: "2025-05-07T16:20:00Z",
    delivered: true,
    read: false,
    processed: false
  }
];

const sampleKnowledge: KnowledgeItem[] = [
  {
    item_id: "knowledge_1",
    content: {
      text: "User research indicates that 78% of users prioritize seamless integration with existing workflows over advanced features. This should inform our product development strategy."
    },
    source_agent_id: "research_agent",
    category: "factual",
    confidence: 0.95,
    tags: ["user_research", "product_strategy", "market_insights"],
    created_at: "2025-05-07T15:00:00Z"
  },
  {
    item_id: "knowledge_2",
    content: {
      text: "Common development challenges in AI assistants include maintaining context across sessions, handling ambiguous queries, and managing computational resources effectively."
    },
    source_agent_id: "development_agent",
    category: "technical",
    confidence: 0.9,
    tags: ["development", "challenges", "best_practices"],
    created_at: "2025-05-06T11:30:00Z"
  },
  {
    item_id: "knowledge_3",
    content: {
      text: "Effective team coordination in multi-agent systems requires clear role definition, structured communication protocols, and shared knowledge repositories."
    },
    source_agent_id: "planning_agent",
    category: "procedural",
    confidence: 0.85,
    tags: ["coordination", "team_management", "best_practices"],
    created_at: "2025-05-05T16:45:00Z"
  }
];

export default CollaborationDashboard;