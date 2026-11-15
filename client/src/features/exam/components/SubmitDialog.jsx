import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { Table, TBody, THead, Td, Th, Tr } from '../../../components/ui/Table.jsx';
import { PALETTE_STATUS as S } from '../constants.js';

/**
 * Confirmation dialog shown before submitting.
 * `rows`: [{ name, total, counts }] where counts come from countStatuses().
 * `notice` lets the caller add context (the prototype uses it to say nothing is submitted).
 */
export default function SubmitDialog({ open, onClose, onConfirm, rows, notice, confirmLabel = 'Submit exam' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Submit exam?"
      description="You will not be able to change your answers after submitting."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Go back to exam
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {notice && <div className="mb-4 rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700">{notice}</div>}

      <Table>
        <THead>
          <Tr>
            <Th>Section</Th>
            <Th align="right">Total</Th>
            <Th align="right">Answered</Th>
            <Th align="right">Not answered</Th>
            <Th align="right">Not visited</Th>
            <Th align="right">Marked</Th>
            <Th align="right">Answered and marked</Th>
          </Tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.name}>
              <Td className="font-medium">{row.name}</Td>
              <Td align="right">{row.total}</Td>
              <Td align="right">{row.counts[S.ANSWERED]}</Td>
              <Td align="right">{row.counts[S.NOT_ANSWERED]}</Td>
              <Td align="right">{row.counts[S.NOT_VISITED]}</Td>
              <Td align="right">{row.counts[S.MARKED]}</Td>
              <Td align="right">{row.counts[S.ANSWERED_MARKED]}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Modal>
  );
}
