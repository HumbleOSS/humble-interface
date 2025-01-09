import { Modal, Button } from "components/ui";

function ZapButton({ amount, recipient }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <>
      <Button onClick={() => setShowConfirmModal(true)}>
        Zap {amount} sats
      </Button>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Zap"
      >
        <div className="space-y-4">
          <div className="text-sm">
            <p>You are about to zap:</p>
            <p className="font-bold">{amount} sats</p>
            <p>to:</p>
            <p className="font-bold">{recipient}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleZap();
                setShowConfirmModal(false);
              }}
            >
              Confirm Zap
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
