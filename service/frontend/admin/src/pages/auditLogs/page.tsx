import { renderWithLoader } from '@metorial-io/data-hooks';
import { Button } from '@metorial-io/ui';
import { Select, Table } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { appsState, auditLogsState } from '../../state';

let AUDIT_LOG_TYPES = [
  'login',
  'login.email',
  'login.oauth',
  'login.sso',
  'logout',
  'auth.blocked',
  'user.created',
  'user.updated',
  'user.deleted',
  'user.email.added',
  'user.email.verified',
  'user.email.primary_changed',
  'user.email.deleted'
];

export let AuditLogsPage = () => {
  let apps = appsState.use({});

  let firstAppId = apps.data?.[0]?.id;
  let [selectedAppId, setSelectedAppId] = useState<string | undefined>();
  useEffect(() => {
    if (firstAppId) setSelectedAppId(firstAppId);
  }, [firstAppId]);

  if (!selectedAppId) {
    return <div>No apps found. Create an app first.</div>;
  }

  return renderWithLoader({ apps })(({ apps }) => {
    return (
      <AuditLogsForApp
        appId={selectedAppId}
        apps={apps.data}
        onAppChange={setSelectedAppId}
      />
    );
  });
};

let AuditLogsForApp = ({
  appId,
  apps,
  onAppChange
}: {
  appId: string;
  apps: { id: string; clientId: string }[];
  onAppChange: (id: string) => void;
}) => {
  let [after, setAfter] = useState<string | undefined>();
  let [type, setType] = useState<string | undefined>();

  let auditLogs = auditLogsState.use({ appId, after, type });

  return renderWithLoader({ auditLogs })(({ auditLogs }) => (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {apps.length > 1 && (
          <select
            value={appId}
            onChange={e => onAppChange(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          >
            {apps.map(app => (
              <option key={app.id} value={app.id}>
                {app.clientId}
              </option>
            ))}
          </select>
        )}

        <Select.Root
          value={type ?? 'all'}
          onValueChange={val => {
            setType(val === 'all' ? undefined : val);
            setAfter(undefined);
          }}
        >
          <Select.Trigger placeholder="Filter by type" />
          <Select.Content>
            <Select.Item value="all">All types</Select.Item>
            {AUDIT_LOG_TYPES.map(t => (
              <Select.Item key={t} value={t}>
                {t}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>IP</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Metadata</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {auditLogs.data.map((log: any) => (
            <Table.Row key={log.id}>
              <Table.Cell>
                <code style={{ fontSize: 12 }}>{log.type}</code>
              </Table.Cell>
              <Table.Cell>{log.user?.email ?? '-'}</Table.Cell>
              <Table.Cell>{log.ip ?? '-'}</Table.Cell>
              <Table.Cell style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.metadata ? JSON.stringify(log.metadata) : '-'}
              </Table.Cell>
              <Table.Cell>{new Date(log.createdAt).toLocaleString('de-at')}</Table.Cell>
            </Table.Row>
          ))}

          {auditLogs.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                No audit logs found
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      {auditLogs.data.length > 0 && (
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(auditLogs.data[auditLogs.data.length - 1]?.id)}
        >
          Load More
        </Button>
      )}
    </>
  ));
};
