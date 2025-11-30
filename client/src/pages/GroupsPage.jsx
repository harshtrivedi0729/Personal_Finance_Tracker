import React from 'react';
import GroupManager from '../components/GroupManager';

export default function GroupsPage({ groups, onCreateGroup }) {
  return (
    <div>
      <h3>Groups</h3>
      <GroupManager groups={groups} onCreateGroup={onCreateGroup} />
    </div>
  );
}
