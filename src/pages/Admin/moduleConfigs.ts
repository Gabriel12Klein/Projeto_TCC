import vinicolaRepresentative from '../../assets/admin/vinicola/representative.png';
import vinicolaName from '../../assets/admin/vinicola/name.png';
import vinicolaCnpj from '../../assets/admin/vinicola/cnpj.png';
import vinicolaCity from '../../assets/admin/vinicola/city.png';
import vinicolaState from '../../assets/admin/vinicola/state.png';
import vinicolaBlockchain from '../../assets/admin/vinicola/blockchain.png';
import safraRepresentative from '../../assets/admin/safra/representative.png';
import safraIdentifier from '../../assets/admin/safra/identifier.png';
import safraYear from '../../assets/admin/safra/year.png';
import safraWine from '../../assets/admin/safra/wine-related.png';
import safraStatus from '../../assets/admin/safra/status.png';
import safraObservation from '../../assets/admin/safra/observation.png';
import vinhoRepresentative from '../../assets/admin/vinho/representative.png';
import loteRepresentative from '../../assets/admin/lote/representative.png';
import loteCode from '../../assets/admin/lote/code.png';
import loteQuantity from '../../assets/admin/lote/quantity.png';
import loteDate from '../../assets/admin/lote/date.png';
import loteVintage from '../../assets/admin/lote/vintage-related.png';
import loteStatus from '../../assets/admin/lote/status.png';

export const moduleConfigs = {
  vinicolas: {
    key: 'vinicolas', label: 'Vinícola', singular: 'vinícola', heading: 'Gerenciamento da Vinícola', icon: vinicolaRepresentative,
    formTitle: 'Dados da Vinícola', formSubtitle: 'Preencha as informações para cadastrar uma nova vinícola.', recordsTitle: 'Registros de Vinícolas', recordsSubtitle: 'Lista e gerenciamento de todas as vinícolas cadastradas.',
    searchPlaceholder: 'Buscar vinícola por nome, cidade ou CNPJ...',
    fields: [
      { name:'name', label:'Nome da vinícola', required:true, placeholder:'Ex.: Vinícola Exemplo', icon:vinicolaName, validation:{ minLength:2 } },
      { name:'cnpj', label:'CNPJ', required:true, placeholder:'00.000.000/0000-00', icon:vinicolaCnpj, mask:'cnpj', maxLength:18, inputMode:'numeric', autoComplete:'off', validation:'cnpj' },
      { name:'city', label:'Cidade', required:true, placeholder:'Ex.: Bento Gonçalves', icon:vinicolaCity, validation:{ minLength:2 } },
      { name:'state', label:'Estado', required:true, type:'select', icon:vinicolaState, options:['RS','SC','PR','SP','MG','BA'] },
      { name:'email', label:'E-mail', required:true, type:'email', placeholder:'exemplo@vinicola.com.br', validation:'email' },
      { name:'wallet', label:'Endereço da carteira blockchain', placeholder:'0x1234...abcd5678efgh...', icon:vinicolaBlockchain, full:true, action:'Gerar / Vincular carteira', note:'Este endereço será utilizado futuramente para registrar os dados da vinícola na blockchain.', validation:'ethereum', disabled:true }
    ],
    columns:[['name','Nome da vinícola'],['cnpj','CNPJ'],['city','Cidade'],['state','Estado'],['email','E-mail'],['wallet','Carteira blockchain'],['status','Status']]
  },
  safras: {
    key:'safras', label:'Safra', singular:'safra', heading:'Gerenciamento da Safra', icon:safraRepresentative,
    formTitle:'Dados da Safra', formSubtitle:'Preencha as informações para cadastrar uma nova safra.', recordsTitle:'Registros de Safras', recordsSubtitle:'Consulte e gerencie todas as safras cadastradas.', searchPlaceholder:'Buscar por identificador ou vinho...',
    fields:[
      { name:'identifier', label:'Identificador da safra', required:true, placeholder:'Ex.: SAFRA-2025-01', icon:safraIdentifier, validation:{ minLength:3 } },
      { name:'wineName', label:'Vinho relacionado', required:true, type:'select', icon:safraWine, options:['Vinum Reserva','Vinho Branco Seco','Vinho Rosé','Espumante Brut','Vinho Tinto Jovem'] },
      { name:'year', label:'Ano da safra', required:true, placeholder:'Ex.: 2025', icon:safraYear, validation:'year', inputMode:'numeric', maxLength:4 },
      { name:'status', label:'Status / Situação', required:true, type:'select', icon:safraStatus, options:['Em andamento','Finalizada','Encerrada'] },
      { name:'observations', label:'Observações', type:'textarea', full:true, icon:safraObservation, placeholder:'Adicione observações relevantes sobre a safra (clima, características, particularidades, etc.).', maxLength:500, note:'Informações adicionais que podem ajudar no acompanhamento e na análise da safra.' }
    ],
    columns:[['identifier','Identificador'],['wineName','Vinho relacionado'],['year','Ano da safra'],['observations','Observações'],['status','Situação'],['createdAt','Data de cadastro']]
  },
  vinhos: {
    key:'vinhos', label:'Vinho', singular:'vinho', heading:'Gerenciamento do Vinho', icon:vinhoRepresentative,
    formTitle:'Dados do Vinho', formSubtitle:'Preencha as informações para cadastrar um novo vinho.', recordsTitle:'Registros de Vinhos', recordsSubtitle:'Consulte e gerencie os vinhos cadastrados.', searchPlaceholder:'Buscar por nome do vinho...',
    fields:[
      { name:'name', label:'Nome do vinho', required:true, placeholder:'Ex.: Reserva Especial Cabernet Sauvignon', validation:{ minLength:2 } },
      { name:'type', label:'Tipo', required:true, type:'select', options:['Tinto','Branco','Rosé','Espumante'] },
      { name:'grapes', label:'Uva ou composição de uvas', required:true, placeholder:'Ex.: Cabernet Sauvignon, Merlot', validation:{ minLength:2 } },
      { name:'volume', label:'Volume', required:true, placeholder:'Ex.: 750', suffix:'ml', validation:'positiveNumber', inputMode:'decimal' },
      { name:'alcohol', label:'Teor alcoólico', required:true, placeholder:'Ex.: 13,5', suffix:'% vol', validation:'alcohol', inputMode:'decimal' },
      { name:'description', label:'Descrição', required:true, type:'textarea', full:true, placeholder:'Descreva o vinho: características, aromas, notas de degustação, harmonização, entre outras informações.', maxLength:1000, validation:{ minLength:10 } },
      { name:'imageFile', label:'Imagem do vinho', type:'file', placeholder:'Selecione uma imagem JPEG, PNG ou WebP de até 5 MB' },
      { name:'status', label:'Situação / Status', required:true, type:'select', options:['Ativo','Em produção','Inativo'] }
    ],
    columns:[['name','Nome do vinho'],['type','Tipo'],['grapes','Uvas'],['volume','Volume'],['alcohol','Teor alcoólico'],['status','Situação']]
  },
  lotes: {
    key:'lotes', label:'Lote', singular:'lote', heading:'Gerenciamento do Lote', icon:loteRepresentative,
    formTitle:'Dados do Lote', formSubtitle:'Preencha as informações para cadastrar um novo lote.', recordsTitle:'Registros de Lotes', recordsSubtitle:'Consulte e gerencie os lotes cadastrados na plataforma.', searchPlaceholder:'Buscar por código do lote...',
    fields:[
      { name:'code', label:'Código do lote', required:true, placeholder:'Ex.: LOTE-2025-0001', icon:loteCode, validation:{ minLength:3 } },
      { name:'vintageName', label:'Safra relacionada', required:true, type:'select', icon:loteVintage, options:['2024','2023','2022','2021','2020'] },
      { name:'quantity', label:'Quantidade produzida', required:true, placeholder:'Ex.: 1.250', icon:loteQuantity, suffix:'L', validation:'positiveNumber', inputMode:'decimal' },
      { name:'productionDate', label:'Data de produção', required:true, type:'date', icon:loteDate, validation:'date' },
      { name:'registrationDate', label:'Data de registro', required:true, type:'date', icon:loteDate, validation:'registrationDate' },
      { name:'status', label:'Situação / Status', required:true, type:'select', icon:loteStatus, options:['Pendente','Registrado','Publicado'] }
    ],
    columns:[['code','Código do lote'],['vintageName','Safra relacionada'],['quantity','Quantidade produzida'],['productionDate','Data de produção'],['registrationDate','Data de registro'],['status','Situação'],['blockchain','Blockchain'],['qrCode','QR Code']],
    blockchainInfo:true
  }
};
