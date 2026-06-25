import { Button, Table, Tag } from "antd";
import type { TableProps } from "antd";
import { ChevronRight } from "lucide-react";
import {
  Project,
  Task,
  importanceLabel,
  priorityLabel,
  statusLabel,
} from "../../domain/models/types";
import dayjs from "dayjs";

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
}

export function TaskList({ tasks, projects, onOpenTask }: TaskListProps) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const columns: TableProps<Task>["columns"] = [
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      render: (_, task) => (
        <Button type="text" className="table-task-title" onClick={() => onOpenTask(task)}>
          {task.title}
        </Button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: Task["status"]) => <Tag variant="filled">{statusLabel[status]}</Tag>,
    },
    {
      title: "Project",
      dataIndex: "projectId",
      key: "projectId",
      width: 180,
      render: (projectId?: string) => projectId ? projectNames.get(projectId) ?? "Unknown" : "Inbox",
    },
    {
      title: "Due",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 130,
      render: (dueDate?: string) => dueDate ?? "None",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (createdAt: string) => dayjs(createdAt).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 130,
      render: (priority: Task["priority"]) => priorityLabel[priority],
    },
    {
      title: "Importance",
      dataIndex: "importance",
      key: "importance",
      width: 140,
      render: (importance: Task["importance"]) => importanceLabel[importance],
    },
    {
      key: "action",
      width: 56,
      render: (_, task) => (
        <Button
          type="text"
          icon={<ChevronRight size={16} />}
          onClick={() => onOpenTask(task)}
        />
      ),
    },
  ];

  return (
    <Table
      className="task-table"
      rowKey="id"
      columns={columns}
      dataSource={tasks}
      pagination={{ pageSize: 12, showSizeChanger: false }}
      size="middle"
    />
  );
}
