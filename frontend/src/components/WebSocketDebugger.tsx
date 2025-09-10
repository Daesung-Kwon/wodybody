import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const WebSocketDebugger: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('연결 안됨');
    const [logs, setLogs] = useState<string[]>([]);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
    };

    useEffect(() => {
        addLog('WebSocket 디버거 시작');

        const newSocket = io('http://localhost:5001', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            withCredentials: true,
            forceNew: true
        });

        newSocket.on('connect', () => {
            setConnectionStatus('연결됨');
            addLog(`WebSocket 연결됨: ${newSocket.id}`);
        });

        newSocket.on('disconnect', (reason) => {
            setConnectionStatus('연결 해제됨');
            addLog(`WebSocket 연결 해제됨: ${reason}`);
        });

        newSocket.on('connect_error', (error) => {
            setConnectionStatus('연결 오류');
            addLog(`WebSocket 연결 오류: ${error.message}`);
        });

        newSocket.on('notification', (data) => {
            addLog(`개인 알림 수신: ${JSON.stringify(data)}`);
        });

        newSocket.on('program_notification', (data) => {
            addLog(`프로그램 알림 수신: ${JSON.stringify(data)}`);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const testJoinRoom = () => {
        if (socket) {
            socket.emit('join_user_room', { user_id: 1 });
            addLog('사용자 방 참여 요청 전송');
        }
    };

    const testLeaveRoom = () => {
        if (socket) {
            socket.emit('leave_user_room', { user_id: 1 });
            addLog('사용자 방 나가기 요청 전송');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: isCollapsed ? '200px' : '350px',
            height: isCollapsed ? '40px' : '250px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '11px',
            zIndex: 1000,
            overflow: 'auto',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '12px' }}>
                    WebSocket 디버거
                </h4>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '2px 5px'
                    }}
                >
                    {isCollapsed ? '▼' : '▲'}
                </button>
            </div>

            <div style={{ marginTop: '5px' }}>
                상태: <strong style={{ color: connectionStatus === '연결됨' ? 'green' : 'red' }}>
                    {connectionStatus}
                </strong>
            </div>

            {!isCollapsed && (
                <>
                    <div style={{ marginTop: '10px' }}>
                        <button
                            onClick={testJoinRoom}
                            style={{
                                margin: '2px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            방 참여 테스트
                        </button>
                        <button
                            onClick={testLeaveRoom}
                            style={{
                                margin: '2px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            방 나가기 테스트
                        </button>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <h5 style={{ margin: '5px 0', fontSize: '11px' }}>로그:</h5>
                        <div style={{
                            height: '120px',
                            overflow: 'auto',
                            backgroundColor: '#fff',
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}>
                            {logs.map((log, index) => (
                                <div key={index} style={{
                                    marginBottom: '2px',
                                    wordBreak: 'break-all',
                                    fontSize: '10px',
                                    lineHeight: '1.2'
                                }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WebSocketDebugger;
