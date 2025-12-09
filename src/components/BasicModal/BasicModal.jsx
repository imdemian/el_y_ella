import React from "react";
import { Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import ModalHeader from "react-bootstrap/ModalHeader";
import "./BasicModal.scss";

function BasicModal(props) {
  // Desestructuramos las props, definiendo valores por defecto
  const {
    show,
    setShow,
    title = "Título predeterminado",
    children,
    size = "lg",
    bodyStyle = {},
  } = props;

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      centered
      backdrop="static"
      keyboard={false}
      size={size}
    >
      <ModalHeader>
        <Modal.Title>{title}</Modal.Title>
        <FontAwesomeIcon
          title="Cerrar ventana"
          icon={faTimesCircle}
          onClick={() => setShow(false)}
          className="close-icon"
        />
      </ModalHeader>
      <Modal.Body style={bodyStyle}>{children}</Modal.Body>
    </Modal>
  );
}

export default BasicModal;
