const taskService = require('../../src/services/taskService');

describe('taskService (Unit Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'Test Task' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('should create a task with custom fields provided', () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
    });

    it('should persist created task in the internal store', () => {
      const task = taskService.create({ title: 'Persisted Task' });
      const found = taskService.findById(task.id);

      expect(found).toEqual(task);
    });
  });

  describe('getAll', () => {
    it('should return an empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all tasks in the store', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });

      const all = taskService.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual([t1, t2]);
    });

    it('should return a shallow copy of tasks array so mutating it does not corrupt the store', () => {
      taskService.create({ title: 'Task 1' });
      const all = taskService.getAll();
      all.pop();

      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return the task matching the provided id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Find Me');
    });

    it('should return undefined when task id is not found', () => {
      const found = taskService.findById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    it('should return only tasks matching the exact specified status', () => {
      const t1 = taskService.create({ title: 'T1', status: 'todo' });
      const t2 = taskService.create({ title: 'T2', status: 'in_progress' });
      const t3 = taskService.create({ title: 'T3', status: 'done' });

      expect(taskService.getByStatus('todo')).toEqual([t1]);
      expect(taskService.getByStatus('in_progress')).toEqual([t2]);
      expect(taskService.getByStatus('done')).toEqual([t3]);
    });

    it('should return empty array if no tasks have the status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      expect(taskService.getByStatus('done')).toEqual([]);
    });

    it('should not match partial status substrings', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      taskService.create({ title: 'T3', status: 'in_progress' });

      expect(taskService.getByStatus('do')).toEqual([]);
      expect(taskService.getByStatus('in')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    it('should return the first page of tasks for page 1', () => {
      const t1 = taskService.create({ title: 'Task 1' });
      const t2 = taskService.create({ title: 'Task 2' });
      const t3 = taskService.create({ title: 'Task 3' });
      const t4 = taskService.create({ title: 'Task 4' });

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1).toEqual([t1, t2]);

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2).toEqual([t3, t4]);
    });

    it('should return empty array when page offset exceeds task count', () => {
      taskService.create({ title: 'Task 1' });
      const result = taskService.getPaginated(5, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return zero counts when store is empty', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should accurately count tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'in_progress' });
      taskService.create({ title: 'T4', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('should count overdue tasks correctly only when dueDate is in past and status is not done', () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      // Overdue: todo with past due date
      taskService.create({ title: 'Overdue Todo', status: 'todo', dueDate: pastDate });
      // Overdue: in_progress with past due date
      taskService.create({ title: 'Overdue In Progress', status: 'in_progress', dueDate: pastDate });
      // NOT Overdue: done with past due date
      taskService.create({ title: 'Done Past', status: 'done', dueDate: pastDate });
      // NOT Overdue: todo with future due date
      taskService.create({ title: 'Future Todo', status: 'todo', dueDate: futureDate });
      // NOT Overdue: todo without due date
      taskService.create({ title: 'No Due Date', status: 'todo', dueDate: null });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(2);
    });
  });

  describe('update', () => {
    it('should update specified fields and return updated task', () => {
      const task = taskService.create({ title: 'Original Title', description: 'Original Desc' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(task.id);
      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('Original Desc');
      expect(updated.priority).toBe('high');

      // Check store
      expect(taskService.findById(task.id).title).toBe('New Title');
    });

    it('should return null if task id does not exist', () => {
      const result = taskService.update('non-existent-id', { title: 'Something' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete existing task and return true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const result = taskService.remove(task.id);

      expect(result).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    it('should return false if task id does not exist', () => {
      const result = taskService.remove('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return false when attempting to remove the same task twice', () => {
      const task = taskService.create({ title: 'Delete Twice' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.remove(task.id)).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('should set status to done and completedAt to current timestamp', () => {
      const task = taskService.create({ title: 'Complete Me', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.id).toBe(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).toString()).not.toBe('Invalid Date');
    });

    it('should preserve original task priority when marking as complete', () => {
      const task = taskService.create({ title: 'High Priority Task', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.priority).toBe('high');
      expect(taskService.findById(task.id).priority).toBe('high');
    });

    it('should return null when task id is not found', () => {
      const result = taskService.completeTask('non-existent-id');
      expect(result).toBeNull();
    });

    it('should maintain done status when called repeatedly on already completed task', () => {
      const task = taskService.create({ title: 'Complete Twice', priority: 'high' });
      const first = taskService.completeTask(task.id);
      expect(first.status).toBe('done');

      const second = taskService.completeTask(task.id);
      expect(second.status).toBe('done');
      expect(second.priority).toBe('high');
      expect(second.completedAt).toBeDefined();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user and return the updated task', () => {
      const task = taskService.create({ title: 'Task to Assign' });
      const assigned = taskService.assignTask(task.id, 'Alice');

      expect(assigned).toBeDefined();
      expect(assigned.id).toBe(task.id);
      expect(assigned.assignee).toBe('Alice');

      const found = taskService.findById(task.id);
      expect(found.assignee).toBe('Alice');
    });

    it('should allow reassigning an already assigned task to a different user', () => {
      const task = taskService.create({ title: 'Reassign Task' });
      taskService.assignTask(task.id, 'Alice');
      const reassigned = taskService.assignTask(task.id, 'Bob');

      expect(reassigned.assignee).toBe('Bob');
      expect(taskService.findById(task.id).assignee).toBe('Bob');
    });

    it('should return null when task id is not found', () => {
      const result = taskService.assignTask('non-existent-id', 'Alice');
      expect(result).toBeNull();
    });
  });

  describe('_reset', () => {
    it('should empty all tasks from the store', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      expect(taskService.getAll()).toHaveLength(2);

      taskService._reset();
      expect(taskService.getAll()).toHaveLength(0);
    });
  });
});
