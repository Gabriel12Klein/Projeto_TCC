import vinicolaRepresentative from '../../assets/admin/vinicola/representative.png';
import vinicolaName from '../../assets/admin/vinicola/name.png';
import vinicolaCnpj from '../../assets/admin/vinicola/cnpj.png';
import vinicolaCity from '../../assets/admin/vinicola/city.png';
import vinicolaState from '../../assets/admin/vinicola/state.png';
import vinicolaBlockchain from '../../assets/admin/vinicola/blockchain.png';
import safraRepresentative from '../../assets/admin/safra/representative.png';
import safraIdentifier from '../../assets/admin/safra/identifier.png';
import safraYear from '../../assets/admin/safra/year.png';
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
    formTitle:'Dados da Safra', formSubtitle:'Preencha as informações para cadastrar uma nova safra.', recordsTitle:'Registros de Safras', recordsSubtitle:'Consulte e gerencie todas as safras cadastradas.', searchPlaceholder:'Buscar por identificador ou uva...',
    fields:[
      { name:'identifier', label:'Identificador da safra', required:true, placeholder:'Ex.: SAFRA-2025-01', icon:safraIdentifier, validation:{ minLength:3 } },
      { name:'grapeIds', label:'Uvas da safra', required:true, type:'multi-select', options:[], validation:{ minLength:1 }, note:'Selecione uma ou mais uvas recebidas ou colhidas nesta safra.' },
      { name:'year', label:'Ano da safra', required:true, placeholder:'Ex.: 2025', icon:safraYear, validation:'year', inputMode:'numeric', maxLength:4 },
      { name:'supplier', label:'Fornecedor / origem', placeholder:'Ex.: Fazenda ou fornecedor da uva', validation:{ minLength:2 } },
      { name:'status', label:'Status / Situação', required:true, type:'select', icon:safraStatus, options:['Em produção','Finalizada'] },
      { name:'observations', label:'Observações', type:'textarea', full:true, icon:safraObservation, placeholder:'Adicione observações relevantes sobre a safra (clima, características, particularidades, etc.).', maxLength:500, note:'Informações adicionais que podem ajudar no acompanhamento e na análise da safra.' }
    ],
    columns:[['identifier','Identificador'],['grapes','Uvas da safra'],['year','Ano da safra'],['observations','Observações'],['status','Situação'],['createdAt','Data de cadastro']]
  },
  vinhos: {
    key:'vinhos', label:'Vinho', singular:'vinho', heading:'Gerenciamento do Vinho', icon:vinhoRepresentative,
    formTitle:'Dados do Vinho', formSubtitle:'Preencha as informações para cadastrar um novo vinho.', sectionTitle:'Descrição do vinho', sectionSubtitle:'Registre as informações que serão apresentadas ao cliente no catálogo.', recordsTitle:'Registros de Vinhos', recordsSubtitle:'Consulte e gerencie os vinhos cadastrados.', searchPlaceholder:'Buscar por nome do vinho...',
    fields:[
      { name:'name', label:'Nome do vinho', required:true, placeholder:'Ex.: Reserva Especial Cabernet Sauvignon', validation:{ minLength:2 } },
      { name:'typeId', label:'Tipo do vinho', required:true, type:'select', options:[] },
      { name:'grapeIds', label:'Uvas utilizadas na composição', required:true, type:'multi-select', options:[], validation:{ minLength:1 }, note:'Selecione uma ou mais uvas que fazem parte da composição deste vinho.' },
      { name:'volume', label:'Volume', required:true, placeholder:'Ex.: 750', suffix:'ml', validation:'positiveNumber', inputMode:'decimal' },
      { name:'alcohol', label:'Teor alcoólico', required:true, placeholder:'Ex.: 13,5', suffix:'% vol', validation:'alcohol', inputMode:'decimal' },
      { name:'description', label:'Descrição do vinho', required:true, type:'textarea', full:true, placeholder:'Escreva uma apresentação geral do vinho.', maxLength:2000, validation:{ minLength:10 } },
      { name:'characteristics', label:'Características', type:'textarea', full:true, placeholder:'Ex.: corpo, cor, acidez, persistência e outras características.', maxLength:2000 },
      { name:'aromas', label:'Aromas', type:'textarea', full:true, placeholder:'Descreva os aromas percebidos no vinho.', maxLength:2000 },
      { name:'tastingNotes', label:'Notas de degustação', type:'textarea', full:true, placeholder:'Registre as notas e percepções da degustação.', maxLength:2000 },
      { name:'pairing', label:'Harmonização', type:'textarea', full:true, placeholder:'Sugira pratos e ocasiões para harmonizar com este vinho.', maxLength:2000 },
      { name:'additionalInfo', label:'Informações complementares', type:'textarea', full:true, placeholder:'Adicione outras informações relevantes para o cliente.', maxLength:2000 },
      { name:'imageFile', label:'Imagem do vinho', type:'file', placeholder:'Selecione uma imagem JPEG, PNG ou WebP de até 5 MB' },
      { name:'status', label:'Situação / Status', required:true, type:'select', options:['Ativo','Inativo'] }
    ],
    columns:[['name','Nome do vinho'],['type','Tipo'],['grapes','Uvas'],['volume','Volume'],['alcohol','Teor alcoólico'],['status','Situação']]
  },
  'tipos-vinho': {
    key:'tipos-vinho', label:'Tipo de vinho', singular:'tipo de vinho', heading:'Gerenciamento dos Tipos de Vinho', icon:vinhoRepresentative,
    formTitle:'Dados do Tipo de Vinho', formSubtitle:'Cadastre opções padronizadas para os vinhos do sistema.', recordsTitle:'Tipos de Vinho', recordsSubtitle:'Consulte e gerencie os tipos disponíveis para seleção.', searchPlaceholder:'Buscar por tipo de vinho...',
    fields:[
      { name:'name', label:'Nome do tipo', required:true, placeholder:'Ex.: Tinto', validation:{ minLength:2 } },
      { name:'description', label:'Descrição', type:'textarea', full:true, placeholder:'Explique brevemente este tipo de vinho.', maxLength:500 },
      { name:'status', label:'Situação', required:true, type:'select', options:['Ativo','Inativo'] }
    ],
    columns:[['name','Nome'],['description','Descrição'],['status','Situação']]
  },
  uvas: {
    key:'uvas', label:'Uva', singular:'uva', heading:'Gerenciamento das Uvas', icon:vinhoRepresentative,
    formTitle:'Dados da Uva', formSubtitle:'Cadastre as uvas utilizadas nas composições dos vinhos.', recordsTitle:'Uvas Cadastradas', recordsSubtitle:'Consulte e gerencie as uvas disponíveis para seleção.', searchPlaceholder:'Buscar por uva...',
    fields:[
      { name:'name', label:'Nome da uva', required:true, placeholder:'Ex.: Cabernet Sauvignon', validation:{ minLength:2 } },
      { name:'description', label:'Descrição', type:'textarea', full:true, placeholder:'Adicione informações sobre a uva, se necessário.', maxLength:500 },
      { name:'status', label:'Situação', required:true, type:'select', options:['Ativo','Inativo'] }
    ],
    columns:[['name','Nome'],['description','Descrição'],['status','Situação']]
  },
  lotes: {
    key:'lotes', label:'Lote', singular:'lote', heading:'Gerenciamento do Lote', icon:loteRepresentative,
    formTitle:'Dados do Lote', formSubtitle:'Preencha as informações para cadastrar um novo lote.', recordsTitle:'Registros de Lotes', recordsSubtitle:'Consulte e gerencie os lotes cadastrados na plataforma.', searchPlaceholder:'Buscar por código do lote...',
    fields:[
      { name:'code', label:'Código do lote', required:true, placeholder:'Ex.: LOTE-2025-0001', icon:loteCode, validation:{ minLength:3 } },
      { name:'wineId', label:'Vinho produzido', required:true, type:'select', icon:vinhoRepresentative, options:[] },
      { name:'vintageId', label:'Safra relacionada', required:true, type:'select', icon:loteVintage, options:[] },
      { name:'grapeIds', label:'Uva ou composição de uvas', required:true, type:'multi-select', options:[], validation:{ minLength:1 } },
      { name:'quantity', label:'Quantidade produzida', required:true, placeholder:'Ex.: 1.250', icon:loteQuantity, suffix:'L', validation:'positiveNumber', inputMode:'decimal' },
      { name:'productionDate', label:'Data de produção', required:true, type:'date', icon:loteDate, validation:'date' },
      { name:'registrationDate', label:'Data de registro', required:true, type:'date', icon:loteDate, validation:'registrationDate' },
      { name:'status', label:'Situação / Status', required:true, type:'select', icon:loteStatus, options:[] }
    ],
    columns:[['code','Código do lote'],['wineName','Vinho produzido'],['vintageName','Safra relacionada'],['grapes','Uvas utilizadas'],['quantity','Quantidade produzida'],['productionDate','Data de produção'],['registrationDate','Data de registro'],['status','Situação'],['blockchain','Blockchain'],['qrCode','QR Code']],
    blockchainInfo:true
  }
};
