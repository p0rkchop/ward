import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock web-push before importing the module under test
const mockSendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockSendNotification,
  },
}));

// Mock db
const mockFindMany = vi.fn();
const mockDelete = vi.fn();
vi.mock('@/app/lib/db', () => ({
  db: {
    pushSubscription: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// Set env vars before module loads
vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key');
vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com');

describe('sendPushToUser', () => {
  let sendPushToUser: typeof import('@/app/lib/push').sendPushToUser;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamically import so env vars and mocks are active
    const mod = await import('@/app/lib/push');
    sendPushToUser = mod.sendPushToUser;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends push to all subscriptions for a user', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'sub-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
      { id: 'sub-2', endpoint: 'https://push.example.com/2', p256dh: 'key2', auth: 'auth2' },
    ]);
    mockSendNotification.mockResolvedValue({});

    await sendPushToUser('user-1', {
      title: 'Test',
      body: 'Hello',
      url: '/dashboard',
    });

    expect(mockFindMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/1', keys: { p256dh: 'key1', auth: 'auth1' } },
      JSON.stringify({ title: 'Test', body: 'Hello', url: '/dashboard' })
    );
  });

  it('does nothing if user has no subscriptions', async () => {
    mockFindMany.mockResolvedValue([]);

    await sendPushToUser('user-1', { title: 'Test', body: 'Hello', url: '/' });

    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('removes stale subscription on 410 Gone', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'sub-stale', endpoint: 'https://push.example.com/stale', p256dh: 'key', auth: 'auth' },
    ]);
    mockSendNotification.mockRejectedValue({ statusCode: 410 });
    mockDelete.mockResolvedValue({});

    await sendPushToUser('user-1', { title: 'Test', body: 'Hello', url: '/' });

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'sub-stale' } });
  });

  it('removes stale subscription on 404', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'sub-404', endpoint: 'https://push.example.com/404', p256dh: 'key', auth: 'auth' },
    ]);
    mockSendNotification.mockRejectedValue({ statusCode: 404 });
    mockDelete.mockResolvedValue({});

    await sendPushToUser('user-1', { title: 'Test', body: 'Hello', url: '/' });

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'sub-404' } });
  });

  it('does not remove subscription on other errors', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'sub-err', endpoint: 'https://push.example.com/err', p256dh: 'key', auth: 'auth' },
    ]);
    mockSendNotification.mockRejectedValue({ statusCode: 500 });

    await sendPushToUser('user-1', { title: 'Test', body: 'Hello', url: '/' });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('never throws even if everything fails', async () => {
    mockFindMany.mockRejectedValue(new Error('DB down'));

    // Should not throw
    await expect(
      sendPushToUser('user-1', { title: 'Test', body: 'Hello', url: '/' })
    ).resolves.toBeUndefined();
  });
});
