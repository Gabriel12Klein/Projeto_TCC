-- A data de registro passa a ser preenchida pelo backend somente quando o lote
-- for salvo com o status "Registrado na blockchain".
ALTER TABLE `lote`
  MODIFY `registrationDate` DATETIME(3) NULL;
