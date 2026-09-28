const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Endpoints (Integration Tests)', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return 200 and an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 200 and all tasks when tasks exist', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status when query param ?status is provided', async () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Progress Task', status: 'in_progress' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Todo Task');
      expect(res.body[0].status).toBe('todo');
    });

    it('should paginate tasks with page and limit query params', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });
      taskService.create({ title: 'Task 3' });
      taskService.create({ title: 'Task 4' });

      const resPage1 = await request(app).get('/tasks?page=1&limit=2');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body).toHaveLength(2);
      expect(resPage1.body[0].title).toBe('Task 1');
      expect(resPage1.body[1].title).toBe('Task 2');

      const resPage2 = await request(app).get('/tasks?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body).toHaveLength(2);
      expect(resPage2.body[0].title).toBe('Task 3');
      expect(resPage2.body[1].title).toBe('Task 4');
    });

    it('should default limit to 10 if only page is specified', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[9].title).toBe('Task 10');
    });

    it('should filter by status and paginate results when both are provided', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'todo' });
      taskService.create({ title: 'T4', status: 'in_progress' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');

      const res2 = await request(app).get('/tasks?status=todo&page=2&limit=2');
      expect(res2.status).toBe(200);
      expect(res2.body).toHaveLength(1);
      expect(res2.body[0].title).toBe('T3');
    });
  });

  describe('POST /tasks', () => {
    it('should return 201 and create task with required title and default fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Task');
      expect(res.body.description).toBe('');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();

      // Ensure actually persisted in store
      expect(taskService.findById(res.body.id)).toBeDefined();
    });

    it('should return 201 and create task with all valid fields', async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString();
      const payload = {
        title: 'Full Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate,
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.title).toBe(payload.title);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    it('should return 400 when title is an empty string or whitespace only', async () => {
      const res1 = await request(app).post('/tasks').send({ title: '' });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toBe('title is required and must be a non-empty string');

      const res2 = await request(app).post('/tasks').send({ title: '   ' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toBe('title is required and must be a non-empty string');
    });

    it('should return 400 when title is not a string', async () => {
      const res = await request(app).post('/tasks').send({ title: 12345 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title is required and must be a non-empty string');
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        status: 'invalid_status',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should return 400 when priority is invalid', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        priority: 'urgent',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    it('should return 400 when dueDate is not a valid date string', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Valid Title',
        dueDate: 'not-a-valid-date',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should return 200 and update task fields', async () => {
      const created = taskService.create({ title: 'Initial Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          status: 'in_progress',
          priority: 'high',
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.description).toBe('Updated Description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');

      // Check store
      expect(taskService.findById(created.id).title).toBe('Updated Title');
    });

    it('should return 404 when updating non-existent task', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    it('should return 400 if updating title with empty string or whitespace', async () => {
      const created = taskService.create({ title: 'Valid Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });

    it('should return 400 if updating status with invalid value', async () => {
      const created = taskService.create({ title: 'Valid Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('status must be one of: todo, in_progress, done');
    });

    it('should return 400 if updating priority with invalid value', async () => {
      const created = taskService.create({ title: 'Valid Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ priority: 'critical' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('priority must be one of: low, medium, high');
    });

    it('should return 400 if updating dueDate with invalid date string', async () => {
      const created = taskService.create({ title: 'Valid Title' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ dueDate: 'invalid-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should return 204 and remove the task from the store', async () => {
      const created = taskService.create({ title: 'To Delete' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Verify deletion in store
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it('should return 404 when deleting non-existent task', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should return 200, mark task as done, and set completedAt timestamp', async () => {
      const created = taskService.create({ title: 'To Complete', priority: 'high' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).toString()).not.toBe('Invalid Date');
      expect(res.body.priority).toBe('high'); // Priority should not be reset to medium!
    });

    it('should return 404 when completing non-existent task', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should assign a task to a user and return 200 with updated task', async () => {
      const created = taskService.create({ title: 'Task to Assign' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
      expect(res.body.assignee).toBe('Alice');

      // Verify in-memory store
      expect(taskService.findById(created.id).assignee).toBe('Alice');
    });

    it('should reassign an already assigned task to another user', async () => {
      const created = taskService.create({ title: 'Task to Reassign' });
      taskService.assignTask(created.id, 'Alice');

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
      expect(taskService.findById(created.id).assignee).toBe('Bob');
    });

    it('should return 400 when assignee is missing from request body', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    it('should return 400 when assignee is an empty string or whitespace only', async () => {
      const created = taskService.create({ title: 'Task' });

      const res1 = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '' });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toBe('assignee is required and must be a non-empty string');

      const res2 = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   ' });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toBe('assignee is required and must be a non-empty string');
    });

    it('should return 400 when assignee is not a string', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    it('should return 404 when assigning a non-existent task', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return 200 with status counts and overdue count', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: pastDate });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });
});
