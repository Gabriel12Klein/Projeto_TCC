export default function ModuleTabs({ tab, onChange }) {
  const base = 'relative w-[clamp(145px,12vw,165px)] h-full border border-[#ddd7d1] border-b-0 rounded-t-[20px] text-[clamp(14px,1.05vw,16px)] cursor-pointer transition-[background-color,border-color,color] duration-150 focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2';
  const active = "bg-white text-[#741328] font-bold after:content-[''] after:absolute after:left-[18px] after:right-[18px] after:bottom-0 after:h-[3px] after:bg-[#8a112b] after:rounded";
  const idle = 'bg-[#f6f3ef] text-[#5b5653] hover:bg-[#fffaf7] hover:text-[#78162a] hover:border-[#ccbcb4]';

  return <div className="flex min-h-12 h-[clamp(48px,5vh,52px)] ml-0.5 items-end shrink-0 z-[3]">
    <button type="button" className={`${base} ${tab==='form' ? active : idle}`} onClick={()=>onChange('form')}>Cadastrar</button>
    <button type="button" className={`${base} ${tab==='records' ? active : idle}`} onClick={()=>onChange('records')}>Registros</button>
  </div>;
}
