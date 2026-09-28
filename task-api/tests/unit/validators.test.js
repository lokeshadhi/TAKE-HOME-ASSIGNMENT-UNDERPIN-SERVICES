const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators (Unit Tests)', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid task data with minimal fields', () => {
      const err = validateCreateTask({ title: 'A valid title' });
      expect(err).toBeNull();
    });

    it('should return null for valid task data with all fields', () => {
      const err = validateCreateTask({
        title: 'A valid title',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date().toISOString(),
      });
      expect(err).toBeNull();
    });

    it('should reject missing title', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
    });

    it('should reject non-string title', () => {
      expect(validateCreateTask({ title: 123 })).toBe('title is required and must be a non-empty string');
    });

    it('should reject empty or whitespace-only title', () => {
      expect(validateCreateTask({ title: '' })).toBe('title is required and must be a non-empty string');
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    it('should reject invalid status', () => {
      const err = validateCreateTask({ title: 'Title', status: 'pending' });
      expect(err).toBe('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      const err = validateCreateTask({ title: 'Title', priority: 'urgent' });
      expect(err).toBe('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate format', () => {
      const err = validateCreateTask({ title: 'Title', dueDate: 'invalid-date' });
      expect(err).toBe('dueDate must be a valid ISO date string');
    });

    it('should allow falsy or null dueDate', () => {
      expect(validateCreateTask({ title: 'Title', dueDate: null })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null when updating with valid fields', () => {
      const err = validateUpdateTask({
        title: 'New title',
        status: 'done',
        priority: 'low',
        dueDate: new Date().toISOString(),
      });
      expect(err).toBeNull();
    });

    it('should return null for empty update body', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('should reject title if provided as empty string or non-string', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
    });

    it('should reject invalid status', () => {
      expect(validateUpdateTask({ status: 'archived' })).toBe('status must be one of: todo, in_progress, done');
    });

    it('should reject invalid priority', () => {
      expect(validateUpdateTask({ priority: 'highest' })).toBe('priority must be one of: low, medium, high');
    });

    it('should reject invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: '2023-99-99' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    it('should return null when assignee is a non-empty string', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
    });

    it('should reject when body is null or undefined', () => {
      expect(validateAssignTask(null)).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask(undefined)).toBe('assignee is required and must be a non-empty string');
    });

    it('should reject when assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    it('should reject when assignee is empty or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    it('should reject when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: true })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: {} })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
