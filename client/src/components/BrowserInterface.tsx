import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { X, ArrowLeft, ArrowRight, RotateCw, Plus, Bookmark, Download, ExternalLink, Search, Star, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  content: string;
  loading: boolean;
  history: string[];
  historyIndex: number;
  error?: string;
}

interface BrowserHistory {
  url: string;
  title: string;
  timestamp: Date;
}

interface Bookmark {
  id: string;
  url: string;
  title: string;
  timestamp: Date;
  tags: string[];
}

interface ExtractedData {
  type: 'link' | 'business' | 'contact' | 'profile';
  title: string;
  url?: string;
  description?: string;
  data?: Record<string, any>;
}

// Main Browser Interface Component
const BrowserInterface: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: "tab1",
      url: "",
      title: "New Tab",
      content: "",
      loading: false,
      history: [],
      historyIndex: -1
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab1");
  const [history, setHistory] = useState<BrowserHistory[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [sessionState, setSessionState] = useState<Record<string, any>>({});
  const [showDataPanel, setShowDataPanel] = useState<boolean>(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  // Generate a random ID for new tabs
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Load stored data on component mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('browserHistory');
    const storedBookmarks = localStorage.getItem('browserBookmarks');
    const storedSessionState = localStorage.getItem('browserSessionState');

    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
    if (storedSessionState) setSessionState(JSON.parse(storedSessionState));
  }, []);

  // Save data when it changes
  useEffect(() => {
    localStorage.setItem('browserHistory', JSON.stringify(history));
    localStorage.setItem('browserBookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('browserSessionState', JSON.stringify(sessionState));
  }, [history, bookmarks, sessionState]);

  // Focus URL input when creating new tab
  useEffect(() => {
    if (activeTab && !activeTab.url && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [activeTabId, activeTab]);

  // BROWSER OPERATIONS
  const navigateTo = async (url: string, tabId: string = activeTabId) => {
    // Normalize URL (add http:// if not present)
    let normalizedUrl = url;
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    if (!normalizedUrl) return;

    const currentTab = tabs.find(tab => tab.id === tabId);
    if (!currentTab) return;

    // Update tab state to loading
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? {
          ...tab,
          loading: true,
          url: normalizedUrl,
          error: undefined,
          history: [...tab.history.slice(0, tab.historyIndex + 1), normalizedUrl],
          historyIndex: tab.historyIndex + 1
        } : tab
      )
    );

    try {
      // Make request to backend to fetch the content and data
      const response = await fetch('/api/browser/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: normalizedUrl,
          sessionState: sessionState[normalizedUrl] || {}
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load: ${response.statusText}`);
      }

      const data = await response.json();

      // Update history
      const now = new Date();
      setHistory(prev => [
        { url: normalizedUrl, title: data.title || normalizedUrl, timestamp: now },
        ...prev.filter(item => item.url !== normalizedUrl).slice(0, 49) // Keep last 50 entries
      ]);

      // Update session state with cookies, form data, etc.
      if (data.sessionData) {
        setSessionState(prev => ({
          ...prev,
          [normalizedUrl]: data.sessionData
        }));
      }

      // Update extracted data if available
      if (data.extractedData) {
        setExtractedData(data.extractedData);
        setShowDataPanel(data.extractedData.length > 0);
      }

      // Update tab with content
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === tabId ? {
            ...tab,
            loading: false,
            title: data.title || normalizedUrl,
            content: data.content,
          } : tab
        )
      );
    } catch (error) {
      console.error("Navigation error:", error);
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === tabId ? {
            ...tab,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load page'
          } : tab
        )
      );
    }
  };

  const createNewTab = () => {
    const newTabId = generateId();
    setTabs([...tabs, {
      id: newTabId,
      url: "",
      title: "New Tab",
      content: "",
      loading: false,
      history: [],
      historyIndex: -1
    }]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      // If it's the last tab, create a new empty tab
      setTabs([{
        id: generateId(),
        url: "",
        title: "New Tab",
        content: "",
        loading: false,
        history: [],
        historyIndex: -1
      }]);
      setActiveTabId(tabs[0].id);
    } else {
      // Remove the tab and select the next available one
      const tabIndex = tabs.findIndex(tab => tab.id === tabId);
      const newTabs = tabs.filter(tab => tab.id !== tabId);
      setTabs(newTabs);
      
      // Select next appropriate tab
      if (tabId === activeTabId) {
        setActiveTabId(newTabs[Math.min(tabIndex, newTabs.length - 1)].id);
      }
    }
  };

  const goBack = () => {
    if (activeTab && activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      const url = activeTab.history[newIndex];
      
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId ? {
            ...tab,
            historyIndex: newIndex
          } : tab
        )
      );
      
      navigateTo(url);
    }
  };

  const goForward = () => {
    if (activeTab && activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      const url = activeTab.history[newIndex];
      
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId ? {
            ...tab,
            historyIndex: newIndex
          } : tab
        )
      );
      
      navigateTo(url);
    }
  };

  const refresh = () => {
    if (activeTab && activeTab.url) {
      navigateTo(activeTab.url);
    }
  };

  const addBookmark = () => {
    if (activeTab && activeTab.url) {
      const existingBookmark = bookmarks.find(bookmark => bookmark.url === activeTab.url);
      
      if (!existingBookmark) {
        const newBookmark: Bookmark = {
          id: generateId(),
          url: activeTab.url,
          title: activeTab.title || activeTab.url,
          timestamp: new Date(),
          tags: []
        };
        
        setBookmarks([...bookmarks, newBookmark]);
      }
    }
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      // If it looks like a URL, navigate directly
      if (searchTerm.includes('.') && !searchTerm.includes(' ')) {
        navigateTo(searchTerm);
      } else {
        // Otherwise, search using the backend
        navigateTo(`/api/browser/search?q=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateTo(e.currentTarget.value);
    }
  };

  // DATA OPERATIONS
  const downloadData = (format: 'json' | 'csv' | 'xlsx') => {
    if (extractedData.length === 0) return;

    // We'll handle this on the backend to properly format the data
    fetch('/api/browser/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        data: extractedData,
        format 
      }),
    })
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `exported-data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => console.error('Failed to export data:', err));
  };

  const saveDataItem = (item: ExtractedData) => {
    // Implement logic to save a specific data item
    console.log('Saving item to collection:', item);
    // Here we would typically send this to the backend to be saved in a database
  };

  // RENDER COMPONENTS
  const renderToolbar = () => (
    <div className="flex items-center space-x-1 p-1 bg-muted rounded-t-md">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={goBack}
        disabled={!activeTab || activeTab.historyIndex <= 0}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={goForward}
        disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={refresh}
        disabled={!activeTab || !activeTab.url}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <Input
          ref={urlInputRef}
          defaultValue={activeTab?.url || ''}
          placeholder="Enter URL or search term"
          className="h-8"
          onKeyDown={handleKeyDown}
        />
      </div>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={addBookmark}
        disabled={!activeTab || !activeTab.url}
      >
        <Bookmark className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setShowDataPanel(!showDataPanel)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderTabs = () => (
    <div className="flex items-center bg-card border-b overflow-x-auto">
      {tabs.map(tab => (
        <div 
          key={tab.id} 
          className={`flex items-center min-w-[120px] max-w-[200px] h-8 px-3 cursor-pointer border-r text-xs truncate ${activeTabId === tab.id ? 'bg-background font-medium' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTabId(tab.id)}
        >
          {tab.loading ? <Spinner size="xs" className="mr-1" /> : null}
          <span className="truncate flex-1">
            {tab.title || "New Tab"}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 ml-1 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8"
        onClick={createNewTab}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderBrowserContent = () => (
    <div className="flex-1 overflow-hidden flex relative">
      {/* Main content area */}
      <ScrollArea className={`flex-1 ${showDataPanel ? 'w-2/3' : 'w-full'}`}>
        {activeTab.loading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : activeTab.error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-red-500 font-semibold mb-2">Error loading page</div>
            <div className="text-sm text-muted-foreground mb-4">{activeTab.error}</div>
            <Button onClick={() => refresh()}>Try Again</Button>
          </div>
        ) : activeTab.content ? (
          <div className="p-4">
            {/* This is simplified - in a real implementation you'd use an iframe or sanitized HTML */}
            <div dangerouslySetInnerHTML={{ __html: activeTab.content }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-xl font-semibold mb-6">New Tab</div>
            <form onSubmit={search} className="w-full max-w-md">
              <div className="flex items-center">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search or enter URL"
                  className="flex-1"
                />
                <Button type="submit" className="ml-2">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </form>
            {/* Bookmarks and history shortcuts could go here */}
          </div>
        )}
      </ScrollArea>

      {/* Data panel */}
      {showDataPanel && (
        <div className="w-1/3 border-l bg-card overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-2 border-b">
            <div className="font-medium">Extracted Data</div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDataPanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Tabs defaultValue="links" className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2">
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>
            
            <TabsContent value="links" className="flex-1 p-2 overflow-auto">
              {extractedData.filter(d => d.type === 'link').length > 0 ? (
                <div className="space-y-2">
                  {extractedData
                    .filter(d => d.type === 'link')
                    .map((link, i) => (
                      <Card key={i} className="p-2">
                        <div className="font-medium text-sm truncate">{link.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                        <div className="flex mt-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-xs"
                            onClick={() => navigateTo(link.url || '')}
                          >
                            Open
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-xs"
                            onClick={() => {
                              const newTabId = generateId();
                              setTabs([...tabs, {
                                id: newTabId,
                                url: "",
                                title: "New Tab",
                                content: "",
                                loading: false,
                                history: [],
                                historyIndex: -1
                              }]);
                              setActiveTabId(newTabId);
                              navigateTo(link.url || '', newTabId);
                            }}
                          >
                            Open in New Tab
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No links found on this page</div>
              )}
            </TabsContent>
            
            <TabsContent value="business" className="flex-1 p-2 overflow-auto">
              {extractedData.filter(d => d.type === 'business').length > 0 ? (
                <div className="space-y-2">
                  {extractedData
                    .filter(d => d.type === 'business')
                    .map((business, i) => (
                      <Card key={i} className="p-3">
                        <div className="font-medium">{business.title}</div>
                        <div className="text-sm mt-1">
                          {business.data && Object.entries(business.data).map(([key, value]) => (
                            <div key={key} className="flex py-1 border-b last:border-0">
                              <span className="text-muted-foreground w-24">{key}:</span>
                              <span>{value as string}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => saveDataItem(business)}
                          >
                            Save
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No business data found</div>
              )}
            </TabsContent>
            
            <TabsContent value="contacts" className="flex-1 p-2 overflow-auto">
              {extractedData.filter(d => d.type === 'contact' || d.type === 'profile').length > 0 ? (
                <div className="space-y-2">
                  {extractedData
                    .filter(d => d.type === 'contact' || d.type === 'profile')
                    .map((contact, i) => (
                      <Card key={i} className="p-3">
                        <div className="font-medium">{contact.title}</div>
                        <div className="text-sm mt-1">
                          {contact.data && Object.entries(contact.data).map(([key, value]) => (
                            <div key={key} className="flex py-1 border-b last:border-0">
                              <span className="text-muted-foreground w-24">{key}:</span>
                              <span>{value as string}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => saveDataItem(contact)}
                          >
                            Save
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No contact information found</div>
              )}
            </TabsContent>
            
            <TabsContent value="export" className="flex-1 p-4">
              <h3 className="font-medium mb-4">Export Data</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-sm mb-2">Format</div>
                  <div className="flex space-x-2">
                    <Button onClick={() => downloadData('json')} variant="outline">JSON</Button>
                    <Button onClick={() => downloadData('csv')} variant="outline">CSV</Button>
                    <Button onClick={() => downloadData('xlsx')} variant="outline">Excel</Button>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-sm mb-2">Data Summary</div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Links</span>
                      <Badge variant="outline">{extractedData.filter(d => d.type === 'link').length}</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Business Records</span>
                      <Badge variant="outline">{extractedData.filter(d => d.type === 'business').length}</Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Contact Information</span>
                      <Badge variant="outline">{extractedData.filter(d => d.type === 'contact' || d.type === 'profile').length}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );

  const renderSidebar = () => (
    <div className="w-64 border-l">
      <Tabs defaultValue="bookmarks">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="bookmarks">
            <Star className="h-4 w-4 mr-2" />
            Bookmarks
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookmarks" className="p-2">
          {bookmarks.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1">
                {bookmarks.map(bookmark => (
                  <div 
                    key={bookmark.id} 
                    className="flex items-center p-2 text-sm hover:bg-muted rounded cursor-pointer"
                    onClick={() => navigateTo(bookmark.url)}
                  >
                    <div className="truncate flex-1">
                      <div className="font-medium truncate">{bookmark.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{bookmark.url}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookmarks(bookmarks.filter(b => b.id !== bookmark.id));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No bookmarks yet
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="p-2">
          {history.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1">
                {history.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center p-2 text-sm hover:bg-muted rounded cursor-pointer"
                    onClick={() => navigateTo(item.url)}
                  >
                    <div className="truncate flex-1">
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.url}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No history yet
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="h-full flex flex-col border rounded-md shadow-sm overflow-hidden">
      {renderToolbar()}
      {renderTabs()}
      <div className="flex-1 flex overflow-hidden">
        {renderBrowserContent()}
        {/* Uncomment to add sidebar */}
        {/* {renderSidebar()} */}
      </div>
    </div>
  );
};

export default BrowserInterface;