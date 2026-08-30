import sidebarBg from '../../../assets/admin/sidebar/sidebar-bg-cropped.png';
import sidebarLogo from '../../../assets/admin/sidebar/logo.png';
import safraIcon from '../../../assets/admin/sidebar/safra.png';
import loteIcon from '../../../assets/admin/sidebar/lote.png';
import vinicolaIcon from '../../../assets/admin/sidebar/vinicola.png';
import vinhoIcon from '../../../assets/admin/sidebar/vinho.png';
import logoutIcon from '../../../assets/admin/sidebar/logout.png';

const items = [
  ['vinicolas','Vinícola',vinicolaIcon],
  ['vinhos','Vinho',vinhoIcon],
  ['tipos-vinho','Tipo de vinho',vinhoIcon],
  ['uvas','Uva',vinhoIcon],
  ['safras','Safra',safraIcon],
  ['lotes','Lote',loteIcon]
];

// O vinho é um cadastro próprio da vinícola e precisa estar disponível antes
// de criar um lote que faça referência a ele.
const visibleItems = items.filter(([key]) => key === 'vinhos' || key === 'lotes' || key === 'safras' || key === 'tipos-vinho' || key === 'uvas');

export default function AdminSidebar({ active, onSelect, onLogout, collapsed, onToggle }) {
  const sidebarPadding = collapsed ? 'pt-5 px-[10px] pb-[22px]' : 'pt-[clamp(20px,1.7vw,26px)] px-[clamp(13px,1.1vw,17px)] pb-[22px]';
  const logoClass = collapsed
    ? 'w-[58px] h-[95px] mt-12 mx-auto mb-[22px]'
    : 'w-[78%] h-[clamp(150px,18vh,190px)] mt-3 mx-auto mb-3';

  return <aside className={`relative w-full min-w-0 h-full rounded-[25px] bg-cover bg-center bg-no-repeat shadow-[0_12px_25px_rgb(56_8_17_/_30%)] overflow-hidden flex flex-col text-white ${sidebarPadding}`} style={{ backgroundImage:`url(${sidebarBg})` }}>
    <button
      className={`absolute top-[18px] w-[42px] h-[42px] border border-[rgba(255,255,255,.27)] rounded-[9px] bg-[rgba(109,25,42,.68)] text-white text-[30px] leading-none cursor-pointer z-[2] transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-[rgba(145,35,56,.88)] hover:border-[rgba(255,255,255,.5)] hover:shadow-[0_5px_14px_rgba(24,0,5,.24)] hover:-translate-y-px active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2 ${collapsed ? 'right-4 rotate-180' : 'right-[13px]'}`}
      type="button"
      aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      onClick={onToggle}
    >‹</button>
    <img className={`${logoClass} object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,.15)] transition-all duration-200`} src={sidebarLogo} alt="VINUM" />
    <nav className="flex flex-col gap-[clamp(7px,1vh,11px)] mt-2">
      {visibleItems.map(([key,label,icon]) => {
        const isActive = active === key;
        return <button
          type="button"
          key={key}
          className={`h-[clamp(52px,5.5vh,58px)] flex items-center ${collapsed ? 'justify-center px-0' : 'justify-start px-[18px] gap-4'} border rounded-xl text-white text-[clamp(16px,1.15vw,18px)] font-semibold cursor-pointer text-left transition-[background-color,border-color,box-shadow] ${isActive ? 'bg-[linear-gradient(90deg,rgba(153,25,49,.58),rgba(101,9,28,.38))] border-[rgba(225,128,148,.50)] shadow-[inset_0_0_18px_rgba(255,92,122,.08)]' : 'bg-transparent border-transparent hover:bg-[linear-gradient(90deg,rgba(153,25,49,.58),rgba(101,9,28,.38))] hover:border-[rgba(225,128,148,.50)] hover:shadow-[inset_0_0_18px_rgba(255,92,122,.08)]'}`}
          onClick={()=>onSelect(key)}
        >
          <img className="w-[31px] h-[31px] object-contain shrink-0" src={icon} alt="" />
          {!collapsed && <span>{label}</span>}
        </button>;
      })}
    </nav>
    <button
      type="button"
      className={`mt-auto mb-[clamp(26px,3.6vh,42px)] min-h-[54px] h-[clamp(54px,5.5vh,58px)] flex items-center ${collapsed ? 'justify-center px-0' : 'justify-start gap-4 px-5'} border border-[rgba(255,255,255,.32)] rounded-[10px] bg-[rgba(77,10,25,.48)] text-white text-[clamp(16px,1.15vw,18px)] font-semibold cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 hover:bg-[rgba(135,21,45,.72)] hover:border-[rgba(239,174,187,.65)] hover:shadow-[0_7px_18px_rgba(25,0,6,.22),inset_0_0_16px_rgba(255,95,125,.08)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2`}
      onClick={onLogout}
    >
      <img className="w-[31px] h-[31px] object-contain shrink-0" src={logoutIcon} alt="" />
      {!collapsed && <span>Logout</span>}
    </button>
  </aside>;
}
