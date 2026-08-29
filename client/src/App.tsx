import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/ui/Header';
import { LeftSidebar } from './components/ui/LeftSidebar';
import { RightSidebar } from './components/ui/RightSidebar';
import { DemoDrawer } from './components/ui/DemoDrawer';
import { GraphCanvas } from './components/graph/GraphCanvas';
import { ToastContainer, type ToastMessage } from './components/ui/Toast';
import { GraphSkeleton } from './components/ui/SkeletonLoader';
import {
  fetchGraph,
  uploadCSV,
  preloadDemo,
  downloadReport,
  createCase,
  type GraphData,
  isBypassModeEnabled,
} from './services/api';
import { getCurrentUser, signOut, onAuthStateChange } from './services/auth';

function App() {
  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Case state
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseName, setCaseName] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isBypassMode] = useState(isBypassModeEnabled()); // Auto-detect bypass mode

  // Graph data
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAllPatterns, setShowAllPatterns] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // Auto-open RightSidebar when a node is selected on mobile
  useEffect(() => {
    if (selectedNodeId) {
      setRightSidebarOpen(true);
    }
  }, [selectedNodeId]);

  // Check auth state on mount
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const checkAuth = async () => {
      try {
        await getCurrentUser();
        if (mounted) {
          // Auto-login: always set a mock user to skip login page
          setUser({ id: 'demo-user', email: 'demo@cybertrace.local' });
          setIsLoadingAuth(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          // Auto-login even on error
          setUser({ id: 'demo-user', email: 'demo@cybertrace.local' });
          setIsLoadingAuth(false);
        }
      }
    };

    checkAuth();

    // Listen for auth state changes (only in production mode)
    onAuthStateChange((authUser) => {
      if (mounted) {
        setUser(authUser ? { id: authUser.id, email: authUser.email } : null);
      }
    }).then((cleanup) => {
      if (mounted) {
        unsubscribe = cleanup;
      }
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Time filter state
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute time bounds from graph meta
  const minTimestamp = graphData?.edges.length
    ? graphData.edges.reduce(
        (min, e) => (e.timeWindow[0] < min ? e.timeWindow[0] : min),
        graphData.edges[0]!.timeWindow[0]
      )
    : null;
  const maxTimestamp = graphData?.edges.length
    ? graphData.edges.reduce(
        (max, e) => (e.timeWindow[1] > max ? e.timeWindow[1] : max),
        graphData.edges[0]!.timeWindow[1]
      )
    : null;

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load graph data for current case + time range + selected node
  const loadGraph = useCallback(
    async (cId: string, start?: string | null, end?: string | null, selectedNode?: string | null) => {
      setIsLoadingGraph(true);
      try {
        const data = await fetchGraph(cId, start || undefined, end || undefined, selectedNode || undefined);
        setGraphData(data);
      } catch (err: any) {
        addToast({
          id: Date.now().toString(),
          type: 'error',
          text: err.message || 'Failed to load graph'
        });
      } finally {
        setIsLoadingGraph(false);
      }
    },
    [addToast]
  );

  // Handle CSV upload
  const handleUpload = useCallback(
    async (file: File, type: 'cdr' | 'transactions') => {
      if (!caseId) {
        addToast({
          id: Date.now().toString(),
          type: 'error',
          text: 'No active case — load demo data or create a case first'
        });
        return;
      }
      setIsUploading(true);
      try {
        const result = await uploadCSV(file, type, caseId);
        addToast({
          id: Date.now().toString(),
          type: 'success',
          text: `Uploaded ${result.inserted} ${type === 'cdr' ? 'CDR' : 'transaction'} records`
        });
        await loadGraph(caseId, undefined, undefined, selectedNodeId);
      } catch (err: any) {
        addToast({
          id: Date.now().toString(),
          type: 'error',
          text: err.message || 'Upload failed'
        });
      } finally {
        setIsUploading(false);
      }
    },
    [caseId, loadGraph, addToast]
  );

  // Handle case creation
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const handleCreateCase = useCallback(async () => {
    setIsCreatingCase(true);
    try {
      const caseName = `Investigation ${new Date().toLocaleDateString()}`;
      const newCase = await createCase(caseName);
      setCaseId(newCase.id);
      setCaseName(newCase.case_name);
      setIsDemoMode(false);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        text: `Created new case: ${newCase.case_name}`
      });
    } catch (err: any) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        text: err.message || 'Failed to create case'
      });
    } finally {
      setIsCreatingCase(false);
    }
  }, [addToast]);

  // Handle demo preload
  const handlePreloadDemo = useCallback(async () => {
    setIsPreloading(true);
    try {
      const result = await preloadDemo();
      setCaseId(result.caseId);
      setCaseName(result.caseName);
      setIsDemoMode(true);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        text: `Loaded ${result.cdrInserted} CDR + ${result.finInserted} transaction records`
      });
      await loadGraph(result.caseId, undefined, undefined, selectedNodeId);
      setShowDemoDrawer(true);
    } catch (err: any) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        text: err.message || 'Demo preload failed'
      });
    } finally {
      setIsPreloading(false);
    }
  }, [loadGraph, addToast]);

  // Handle demo reset
  const handleResetDemo = useCallback(() => {
    setCaseId(null);
    setCaseName(null);
    setGraphData(null);
    setIsDemoMode(false);
    setSelectedNodeId(null);
    setTimeStart('');
    setTimeEnd('');
    setShowDemoDrawer(false);
  }, []);

  // Handle time range changes (debounced)
  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setTimeStart(start);
      setTimeEnd(end);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (caseId) loadGraph(caseId, start || undefined, end || undefined, selectedNodeId);
      }, 300);
    },
    [caseId, loadGraph, selectedNodeId]
  );

  // Handle pattern filtering
  const handleFilterPatterns = useCallback((filterNode: string | null) => {
    setShowAllPatterns(filterNode === null);
    if (caseId) {
      loadGraph(caseId, timeStart || undefined, timeEnd || undefined, filterNode);
    }
  }, [caseId, loadGraph, timeStart, timeEnd]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
      setCaseId(null);
      setCaseName(null);
      setGraphData(null);
      setSelectedNodeId(null);
      setTimeStart('');
      setTimeEnd('');
      addToast({
        id: Date.now().toString(),
        type: 'success',
        text: 'Logged out successfully'
      });
    } catch (error: any) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        text: error.message || 'Logout failed'
      });
    }
  }, [addToast]);

  // Handle report export
  const handleExport = useCallback(
    async (format: 'pdf' | 'csv') => {
      if (!caseId) return;
      try {
        await downloadReport(caseId, format);
        addToast({
          id: Date.now().toString(),
          type: 'success',
          text: `Report exported as ${format.toUpperCase()}`
        });
      } catch (err: any) {
        addToast({
          id: Date.now().toString(),
          type: 'error',
          text: err.message || 'Export failed'
        });
      }
    },
    [caseId]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to deselect node
      if (e.key === 'Escape' && selectedNodeId) {
        setSelectedNodeId(null);
        e.preventDefault();
      }
      
      // Delete to remove selected node from view
      if (e.key === 'Delete' && selectedNodeId) {
        setSelectedNodeId(null);
        e.preventDefault();
      }
      
      // Ctrl+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          e.preventDefault();
        }
      }
      
      // 1-9 to switch between saved views (when views are implemented)
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        // TODO: Implement view switching
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  // Handle node search
  const handleSearchNode = useCallback((query: string) => {
    if (!graphData) return;
    
    const matchingNode = graphData.nodes.find(node => 
      node.id.toLowerCase().includes(query.toLowerCase())
    );
    
    if (matchingNode) {
      setSelectedNodeId(matchingNode.id);
    } else {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        text: `No node found matching "${query}"`
      });
    }
  }, [graphData, addToast]);

  // Show loading state while checking auth
  if (isLoadingAuth) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-base">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-text-muted font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-base text-text-primary overflow-hidden">
      <Header
        caseName={caseName}
        caseId={caseId}
        isDemoMode={isDemoMode}
        isPreloading={isPreloading}
        onLoadDemo={handlePreloadDemo}
        onResetDemo={handleResetDemo}
        onExportReport={handleExport}
        canExport={!!caseId && !!graphData}
        isBypassMode={isBypassMode}
        user={user}
        onLogout={handleLogout}
        onSearchNode={!!graphData ? handleSearchNode : undefined}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar
          caseId={caseId}
          minTimestamp={minTimestamp}
          maxTimestamp={maxTimestamp}
          timeStart={timeStart}
          timeEnd={timeEnd}
          onTimeChange={handleTimeChange}
          onUpload={handleUpload}
          onCreateCase={handleCreateCase}
          isUploading={isUploading}
          isCreatingCase={isCreatingCase}
          meta={graphData?.meta ?? null}
          isOpen={leftSidebarOpen}
          onClose={() => setLeftSidebarOpen(false)}
        />

        {/* Center: graph canvas */}
        <div id="main-content" className="flex-1 flex flex-col overflow-hidden relative" tabIndex={-1}>
          {isLoadingGraph ? (
            <GraphSkeleton />
          ) : (
            <GraphCanvas
              nodes={graphData?.nodes ?? []}
              edges={graphData?.edges ?? []}
              patterns={graphData?.patterns ?? []}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onUpload={handleUpload}
            />
          )}
        </div>

        <RightSidebar
          nodes={graphData?.nodes ?? []}
          patterns={graphData?.patterns ?? []}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onFilterPatterns={handleFilterPatterns}
          showAllPatterns={showAllPatterns}
          isOpen={rightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
        />
      </div>

      <DemoDrawer
        isOpen={showDemoDrawer}
        onClose={() => setShowDemoDrawer(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
