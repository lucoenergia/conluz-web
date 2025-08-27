import * as React from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';

interface BasicModalProps {
  isOpen: boolean,
  onClose: () => void,
  children: React.ReactNode; 
}

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export const BasicModal: React.FC<BasicModalProps> = ({isOpen, onClose, children}) => {

  const onCloseModal = () => {
          onClose();
        };

  return (
    <div>
      <Modal
        open={isOpen}
        onClose={onCloseModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-descriptionimport Modal from '@mui/material/Modal';"
      >
        <Box sx={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: 2, 
        }}>
            {children}
        </Box>
      </Modal>
    </div>
  );
}