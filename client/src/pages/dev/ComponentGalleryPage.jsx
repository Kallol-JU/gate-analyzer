import { useState } from 'react';
import PrototypeBanner from '../../components/common/PrototypeBanner.jsx';
import ApiStatusBadge from '../../components/common/ApiStatusBadge.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card, { CardHeader } from '../../components/ui/Card.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Tabs from '../../components/ui/Tabs.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../components/ui/Table.jsx';
import StatusSwatch from '../../features/exam/components/StatusSwatch.jsx';
import { PALETTE_STATUS_LABEL, PALETTE_STATUS_ORDER } from '../../features/exam/constants.js';
import MathText from '../../components/common/MathText.jsx';
import { useUiStore } from '../../store/uiStore.js';

function Block({ title, children }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="p-5">{children}</div>
    </Card>
  );
}

/** Development-only page (the route is registered only when running `npm run dev`). */
export default function ComponentGalleryPage() {
  const [tab, setTab] = useState('one');
  const [modalOpen, setModalOpen] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <PrototypeBanner>Development page for reviewing UI components. It is not part of the production build.</PrototypeBanner>
      <h1 className="font-serif text-3xl font-semibold text-ink-900">Component gallery</h1>

      <Block title="API connection (real)">
        <ApiStatusBadge detailed />
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="review">Review</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Block>

      <Block title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Label" placeholder="Placeholder" hint="Helper text." />
          <Input label="With error" defaultValue="abc" error="This value is not valid." />
          <Checkbox label="Checkbox" description="Optional description." />
        </div>
      </Block>

      <Block title="Badges, progress, spinner">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Neutral</Badge>
          <Badge tone="primary">Primary</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="purple">Purple</Badge>
          <Spinner />
        </div>
        <div className="mt-4 grid max-w-md gap-3">
          <ProgressBar value={72} label="Example" />
          <ProgressBar value={40} tone="warning" label="Example" />
          <ProgressBar value={18} tone="danger" label="Example" />
        </div>
      </Block>

      <Block title="Tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'one', label: 'First', count: 3 },
            { id: 'two', label: 'Second', count: 7 },
          ]}
        />
        <p className="mt-3 text-sm text-ink-600">Selected tab: {tab}</p>
      </Block>

      <Block title="Question palette states">
        <ul className="grid gap-3 sm:grid-cols-2">
          {PALETTE_STATUS_ORDER.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <StatusSwatch status={s}>{i + 1}</StatusSwatch>
              {PALETTE_STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Math rendering (KaTeX)">
        <MathText className="font-serif text-lg">
          {String.raw`Inline $T(n) = 2T(n/2) + n$ and display: $$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$`}
        </MathText>
      </Block>

      <Block title="Table">
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th align="right">Value</Th>
            </Tr>
          </THead>
          <TBody>
            <Tr>
              <Td>Row one</Td>
              <Td align="right">12</Td>
            </Tr>
            <Tr>
              <Td>Row two</Td>
              <Td align="right">34</Td>
            </Tr>
          </TBody>
        </Table>
      </Block>

      <Block title="Modal and toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="secondary" onClick={() => addToast({ tone: 'success', title: 'Saved', message: 'Example toast.' })}>
            Show toast
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
          description="Press Esc or click outside to close."
          size="sm"
          footer={<Button onClick={() => setModalOpen(false)}>Done</Button>}
        >
          <p className="text-sm text-ink-700">Modal content goes here.</p>
        </Modal>
      </Block>

      <Block title="Empty state">
        <EmptyState icon="history" title="No attempts yet" description="Finish a test and it will appear here." />
      </Block>
    </div>
  );
}
