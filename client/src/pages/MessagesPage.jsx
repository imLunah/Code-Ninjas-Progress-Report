import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api } from '../api/client';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [toggling, setToggling] = useState(null);

  const fetchThreads = useCallback(() => {
    api.get('/messages/threads')
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 30000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  const handleMarkRead = async (e, studentId) => {
    e.stopPropagation();
    setToggling(studentId);
    try {
      await api.post(`/messages/threads/${studentId}/read`);
      setThreads((prev) => prev.map((t) =>
        t.student_id === studentId ? { ...t, is_unread: false, read_at: new Date().toISOString() } : t
      ));
    } catch {}
    setToggling(null);
  };

  const handleMarkUnread = async (e, studentId) => {
    e.stopPropagation();
    setToggling(studentId);
    try {
      await api.post(`/messages/threads/${studentId}/unread`);
      setThreads((prev) => prev.map((t) =>
        t.student_id === studentId ? { ...t, is_unread: true, read_at: null } : t
      ));
    } catch {}
    setToggling(null);
  };

  const handleOpenConversation = (studentId) => {
    // Mark as read immediately when opening a conversation
    const thread = threads.find((t) => t.student_id === studentId);
    if (thread?.is_unread) {
      api.post(`/messages/threads/${studentId}/read`).catch(() => {});
      setThreads((prev) => prev.map((t) =>
        t.student_id === studentId ? { ...t, is_unread: false } : t
      ));
    }
    navigate(`/manager/students/${studentId}?scrollTo=messages`);
  };

  const displayed = filter === 'unread' ? threads.filter((t) => t.is_unread) : threads;
  const unreadCount = threads.filter((t) => t.is_unread).length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Parent <span className="text-ninja-blue">Messages</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">
              {unreadCount > 0 ? `${unreadCount} unread conversation${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-ninja-blue text-white'
                  : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-ninja font-semibold transition-colors flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-ninja-blue text-white'
                  : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none ${
                  filter === 'unread' ? 'bg-white text-ninja-blue' : 'bg-ninja-red text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
        ) : displayed.length === 0 ? (
          <div className="bg-white border border-ninja-border rounded-2xl p-12 text-center shadow-sm">
            <p className="text-ninja-navy font-ninja font-bold text-lg mb-1">
              {filter === 'unread' ? 'No unread messages' : 'No parent messages yet'}
            </p>
            <p className="text-ninja-muted font-ninja text-sm">
              {filter === 'unread' ? 'Switch to "All" to see previous conversations.' : 'Parent messages will appear here once a parent reaches out.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-ninja-border rounded-2xl shadow-sm overflow-hidden divide-y divide-ninja-border">
            {displayed.map((thread) => (
              <div
                key={thread.student_id}
                onClick={() => handleOpenConversation(thread.student_id)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-ninja-bg transition-colors group ${
                  thread.is_unread ? 'bg-blue-50 hover:bg-blue-100/60' : ''
                }`}
              >
                {/* Unread dot */}
                <div className="flex-shrink-0 mt-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${thread.is_unread ? 'bg-ninja-blue' : 'bg-transparent'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`font-ninja text-ninja-navy truncate ${thread.is_unread ? 'font-bold' : 'font-semibold'}`}>
                      {thread.student_name}
                    </span>
                    <span className="text-ninja-muted font-ninja text-xs flex-shrink-0">
                      {timeAgo(thread.latest_parent_at)}
                    </span>
                  </div>
                  {thread.parent_name && (
                    <p className="text-ninja-muted font-ninja text-xs mb-1">{thread.parent_name}</p>
                  )}
                  <p className={`font-ninja text-sm truncate ${thread.is_unread ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
                    {thread.latest_sender_type === 'staff' && (
                      <span className="text-ninja-muted">You: </span>
                    )}
                    {thread.latest_message}
                  </p>
                </div>

                {/* Actions — always visible */}
                <div
                  className="flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {thread.is_unread ? (
                    <button
                      onClick={(e) => handleMarkRead(e, thread.student_id)}
                      disabled={toggling === thread.student_id}
                      className="text-xs font-ninja font-semibold text-ninja-muted hover:text-ninja-blue border border-ninja-border hover:border-ninja-blue bg-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleMarkUnread(e, thread.student_id)}
                      disabled={toggling === thread.student_id}
                      className="text-xs font-ninja font-semibold text-ninja-muted hover:text-ninja-blue border border-ninja-border hover:border-ninja-blue bg-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Mark unread
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
