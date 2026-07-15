import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import KanbanBoard from './kanban-board';

export default async function TasksPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch all tasks, nested subtasks, and linked projects
  // Query tasks and projects in parallel
  const [tasks, projects] = await Promise.all([
    db.task.findMany({
      where: { userId },
      include: {
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
        project: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Prepare safe serializable objects for props mapping
  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    status: t.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE',
    priority: t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    projectId: t.projectId || '',
    projectName: t.project?.name || '',
    subtasks: t.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      isCompleted: s.isCompleted,
    })),
  }));

  const serializedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Kanban Task Board
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Organize your milestones and personal work items. Drag or select to change columns.
        </p>
      </div>

      <KanbanBoard 
        initialTasks={serializedTasks} 
        projects={serializedProjects} 
      />
    </div>
  );
}
