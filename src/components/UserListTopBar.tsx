'use client';

import React from 'react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}


interface Props {
  profiles: Profile[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

const getStatusColor = (name: string) => {
  // Fake logic for demo purposes — rotate colors based on hash of name
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mod = hash % 3;
  if (mod === 0) return 'green';
  if (mod === 1) return 'orange';
  return 'red';
};

export default function UserListTopBar({
  profiles,
  selectedUserId,
  onSelectUser,
}: Props) {
  return (
    <div style={{ overflowX: 'auto', display: 'flex', gap: '16px', padding: '12px 0' }}>
      {profiles.map((profile) => {
        const statusColor = getStatusColor(profile.first_name || '');
        const isSelected = selectedUserId === profile.id;

        return (
          <div
            key={profile.id}
            onClick={() => onSelectUser(profile.id)}
            style={{
              cursor: 'pointer',
              padding: '10px 16px',
              borderRadius: '12px',
              border: isSelected ? '2px solid #0070f3' : '1px solid #ccc',
              backgroundColor: isSelected ? '#f0f8ff' : '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              minWidth: 120,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: statusColor,
                margin: '0 auto 6px',
              }}
            />
            <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              {profile.first_name || 'Unnamed'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
