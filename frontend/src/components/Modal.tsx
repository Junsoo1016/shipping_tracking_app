import { ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

const Modal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.content}>
        <div className={styles.header}>
          {title && <h3>{title}</h3>}
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close modal">
            X
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
