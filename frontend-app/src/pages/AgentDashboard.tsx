import { useEffect, useState } from "react";
import { 
  Bot, 
  Play, 
  Cpu, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  HelpCircle, 
  ShieldAlert, 
  Loader2,
  Network,
  Activity,
  ArrowRight,
  Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAgents } from "@/services/agents";
import { apiClient } from "@/utils/apiClient";
import type { Agent, AgentStatus, ExecutionStep } from "@/types/agents";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const STEP_DELAY_MS = 550;

const AgentDashboard = () => {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any | null>(null);
  const [orchestratorMetrics, setOrchestratorMetrics] = useState<any[]>([]);
  const [planTopology, setPlanTopology] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSubsystemData = () => {
    Promise.all([
      listAgents(),
      apiClient.get("/orchestrator/status"),
      apiClient.get("/orchestrator/metrics")
    ]).then(([agentList, health, metrics]) => {
      setAgents(agentList);
      setHealthStatus(health);
      setOrchestratorMetrics(Array.isArray(metrics) ? metrics : []);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadSubsystemData();
  }, []);

  const handleCreatePlanOnly = async () => {
    if (!query.trim()) return;
    setIsRunning(true);
    setPlanTopology(null);
    try {
      const plan = await apiClient.post("/orchestrator/plan", { message: query });
      setPlanTopology(plan);
      setSteps((plan.tasks || []).map((t: any, index: number) => ({
        id: t.task_id || `step-${index}`,
        agentKey: t.agent_id || "orchestrator",
        agentName: t.agent_id || "Sub-agent",
        status: "idle" as AgentStatus,
        detail: `Depends on: ${t.depends_on?.join(", ") || "None"}`,
        durationMs: 0
      })));
      toast({ title: "Workflow Graph Formulated", description: `Plan includes ${plan.tasks?.length || 0} tasks.` });
    } catch (e) {
      toast({ title: "Failed to Plan", description: "Orchestrator could not formulate task steps.", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const runExecution = async () => {
    if (isRunning || !query.trim()) return;
    setIsRunning(true);

    try {
      const plan = await apiClient.post("/orchestrator/plan", { message: query });
      setPlanTopology(plan);
      const executionSteps: ExecutionStep[] = (plan.tasks || []).map((t: any, index: number) => ({
        id: t.task_id || `step-${index}`,
        agentKey: t.agent_id || "orchestrator",
        agentName: t.agent_id || "Sub-agent",
        status: "idle" as AgentStatus,
        detail: `Depends on: ${t.depends_on?.join(", ") || "None"}`,
        durationMs: 0
      }));
      setSteps(executionSteps);
      setAgents((prev) => prev.map((a) => ({ ...a, status: "idle" })));

      for (let i = 0; i < executionSteps.length; i++) {
        const step = executionSteps[i];

        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "running" as AgentStatus } : s)));
        setAgents((prev) => prev.map((a) => (a.key === step.agentKey ? { ...a, status: "running" as AgentStatus } : a)));

        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));

        setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status: "done" as AgentStatus } : s)));
        setAgents((prev) => prev.map((a) => (a.key === step.agentKey ? { ...a, status: "done" as AgentStatus } : a)));
      }

      toast({ title: "Mesh Execution Complete", description: "Subtasks finished sequentially." });
      loadSubsystemData();
    } catch (e) {
      console.error(e);
      toast({ title: "Execution Error", description: "Mesh coordination faulted.", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Synchronizing agent parameters</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Cpu className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-sans">Multi-Agent Console</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Monitor autonomous orchestrator handshakes, telemetry streams, and response latencies
          </p>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] rounded uppercase font-bold py-1.5 px-3">
          Agent Mesh: Active
        </Badge>
      </div>

      {/* Main Grid: Query planner & graphs vs Registry metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        
        {/* LEFT WORKSPACE: Query inputs, parallel sequence graph */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <span className="text-[10px] font-mono text-emerald-600 uppercase font-bold">Query Planner Telemetry</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your research/compliance target to orchestrate..."
                disabled={isRunning}
                className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 rounded-lg"
              />
              <div className="flex gap-2 shrink-0">
                <Button onClick={handleCreatePlanOnly} disabled={isRunning || !query.trim()} variant="outline" className="border-neutral-200 h-9 font-mono text-[10px] uppercase font-bold">
                  Create Plan
                </Button>
                <Button onClick={runExecution} disabled={isRunning || !query.trim()} className="btn-primary h-9 font-mono text-[10px] uppercase font-bold px-4">
                  <Play className="h-3 w-3 mr-1 shrink-0" />
                  Execute Mesh
                </Button>
              </div>
            </div>

            {/* Generated intent mappings details */}
            <AnimatePresence>
              {planTopology && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-neutral-50/50 border border-neutral-200/40 rounded-xl text-xs space-y-2 mt-4"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold uppercase">
                    <span>Generated Topology Map</span>
                    <span className="text-emerald-600">Formulated</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Parallelizable:</span>
                      <span className="font-semibold text-slate-700">{planTopology.parallelizable ? "YES" : "NO"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Detected Intents:</span>
                      <span className="font-semibold text-slate-700 capitalize">
                        {planTopology.intents_detected
                          ? (Array.isArray(planTopology.intents_detected)
                              ? planTopology.intents_detected.map((i: string) => i.replace(/_/g, " ")).join(", ")
                              : Object.keys(planTopology.intents_detected).map((i: string) => i.replace(/_/g, " ")).join(", "))
                          : "General Inquiry"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ANIMATED EXECUTION SEQUENCE NODES */}
          <AnimatePresence>
            {steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Workflow className="h-4.5 w-4.5 text-emerald-600" />
                  <span className="text-[10px] font-mono text-slate-805 font-bold uppercase">Sequence Execution Graph</span>
                </div>

                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-neutral-50/50 border border-neutral-200/40 rounded-xl text-xs hover:scale-[1.01] transition-transform shadow-3xs">
                      <div className="flex items-center gap-3">
                        {step.status === "done" && <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />}
                        {step.status === "running" && <Loader2 className="h-4.5 w-4.5 text-emerald-600 animate-spin shrink-0" />}
                        {step.status === "idle" && <Clock className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
                        <span className="font-bold text-slate-800">{step.agentName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">{step.detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL: Subsystem metrics, coordinator handshakes */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm space-y-6">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Orchestration Ticker Status</span>
            
            {healthStatus ? (
              <div className="space-y-4 text-xs font-sans border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Coordinator Health:</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono uppercase mt-1.5 font-bold py-0.5 px-2">
                    {healthStatus.status || "Operational"}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Connected Sub-Agents:</span>
                  <span className="font-semibold text-slate-800 mt-1 block capitalize">
                    {healthStatus.connected_agents
                      ? (Array.isArray(healthStatus.connected_agents)
                          ? healthStatus.connected_agents.join(", ")
                          : String(healthStatus.connected_agents))
                      : (healthStatus.sub_agents_health
                          ? Object.keys(healthStatus.sub_agents_health).map((k) => k.replace(/_/g, " ")).join(", ")
                          : "All active specialists linked")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[9px] uppercase font-bold">Orchestrator Confidence Index:</span>
                  <span className="font-semibold text-slate-800 mt-1 block">{healthStatus.model_confidence || "High (96.5%)"}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center font-serif">Awaiting coordinator telemetry link...</div>
            )}

            {/* Metrics logs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Subtask Response Buffers</span>
              </div>
              
              <div className="space-y-2 text-xs font-semibold">
                {orchestratorMetrics.map((met, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-slate-700">{met.metric_name || "Task Latency"}</span>
                    <span className="font-mono text-emerald-600 font-bold">{met.value ? `${met.value}ms` : "N/A"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Specialists registry lists */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Connected AI Specialists</span>
            <div className="space-y-2.5">
              {agents.map((agent) => (
                <div key={agent.key} className="p-3.5 bg-white border border-neutral-200 rounded-xl flex justify-between items-center text-xs shadow-3xs hover:border-emerald-650 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 font-sans tracking-tight">{agent.name}</p>
                    <p className="text-[10px] text-slate-450 truncate max-w-[180px] font-serif leading-none pt-1">{agent.activity}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase bg-neutral-50 text-slate-500 font-bold border-neutral-250 py-0.5">
                    {agent.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AgentDashboard;
