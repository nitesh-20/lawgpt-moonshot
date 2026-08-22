import asyncio
import time
from typing import Any, Callable
from loguru import logger


class ExecutionManager:
    """
    Coordinates child agent executions, supporting concurrent parallel batches,
    sequential dependency orders, transient error retries, and timing metrics.
    """
    def __init__(self, max_retries: int = 2, default_timeout_sec: float = 10.0) -> None:
        self.max_retries = max_retries
        self.default_timeout_sec = default_timeout_sec
        self.metrics: list[dict[str, Any]] = []

    async def execute_task(self, task_id: str, agent_id: str, execute_fn: Callable[[], Any]) -> dict[str, Any]:
        retries = 0
        start_time = time.time()

        while retries <= self.max_retries:
            try:
                res = await asyncio.wait_for(execute_fn(), timeout=self.default_timeout_sec)
                end_time = time.time()
                duration = round(end_time - start_time, 3)

                metric = {
                    "task_id": task_id,
                    "agent_id": agent_id,
                    "duration_sec": duration,
                    "retries": retries,
                    "status": "success"
                }
                self.metrics.append(metric)
                return {
                    "task_id": task_id,
                    "agent_id": agent_id,
                    "status": "success",
                    "duration_sec": duration,
                    "output": res
                }
            except asyncio.TimeoutError:
                retries += 1
                logger.warning(f"Task {task_id} timed out. Retry {retries}/{self.max_retries}")
            except Exception as e:
                retries += 1
                logger.error(f"Task {task_id} failed: {e}. Retry {retries}/{self.max_retries}")

        end_time = time.time()
        duration = round(end_time - start_time, 3)
        metric = {
            "task_id": task_id,
            "agent_id": agent_id,
            "duration_sec": duration,
            "retries": retries - 1,
            "status": "failed"
        }
        self.metrics.append(metric)
        return {
            "task_id": task_id,
            "agent_id": agent_id,
            "status": "failed",
            "duration_sec": duration,
            "error": "Max retries exceeded or execution timed out."
        }

    async def execute_plan(
        self, plan_tasks: list[dict[str, Any]], execute_map: dict[str, Callable[[], Any]], run_in_parallel: bool = False
    ) -> list[dict[str, Any]]:
        """
        Coordinates full plan execution. Runs tasks in parallel or sequential orders based on plan definitions.
        """
        results = []
        if run_in_parallel:
            jobs = []
            for task in plan_tasks:
                task_id = task["task_id"]
                agent_id = task["agent_id"]
                execute_fn = execute_map.get(agent_id)
                if execute_fn:
                    jobs.append(self.execute_task(task_id, agent_id, execute_fn))
            results = await asyncio.gather(*jobs)
        else:
            task_outputs: dict[str, dict[str, Any]] = {}
            for task in plan_tasks:
                task_id = task["task_id"]
                agent_id = task["agent_id"]
                depends_on = task.get("depends_on", [])

                dep_failed = False
                for dep_id in depends_on:
                    if dep_id in task_outputs and task_outputs[dep_id].get("status") == "failed":
                        dep_failed = True
                        break

                if dep_failed:
                    logger.warning(f"Skipping task {task_id} due to dependency failure.")
                    results.append({
                        "task_id": task_id,
                        "agent_id": agent_id,
                        "status": "skipped",
                        "reason": "Dependency task failed."
                    })
                    continue

                execute_fn = execute_map.get(agent_id)
                if execute_fn:
                    res = await self.execute_task(task_id, agent_id, execute_fn)
                    task_outputs[task_id] = res
                    results.append(res)
        return results
