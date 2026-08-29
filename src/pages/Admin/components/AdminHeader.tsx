import profileIcon from '../../../assets/admin/common/profile.png';
import dividerSmall from '../../../assets/admin/common/divider-small.png';

export default function AdminHeader({ heading, user }) {
  return <header className="min-h-[clamp(125px,15vh,165px)] flex items-start justify-between gap-6 pt-[clamp(8px,1vh,12px)] pr-[clamp(6px,1vw,14px)] pb-0 pl-[clamp(8px,1.1vw,18px)] shrink-0 max-[1450px]:min-h-[135px]">
    <div className="min-w-0">
      <h1 className="m-0 font-playfair text-[clamp(43px,3.7vw,56px)] leading-none text-vinum-burgundy font-semibold tracking-[.02em] max-[1450px]:text-[46px]">Admin</h1>
      <p className="mt-[7px] mx-0 mb-0.5 text-[#b17735] text-[clamp(16px,1.25vw,19px)] font-medium">{heading}</p>
      <img className="block w-[clamp(220px,17vw,265px)] h-auto mt-2 object-contain object-left pointer-events-none select-none" src={dividerSmall} alt="" aria-hidden="true" />
    </div>
    <button className="flex items-center gap-2 border-0 bg-transparent text-[clamp(13px,1vw,15px)] cursor-pointer mt-[3px] whitespace-nowrap shrink-0 transition-[transform,color] duration-150 hover:text-[#7d1429] hover:-translate-y-px focus-visible:outline-[3px] focus-visible:outline-[rgba(194,137,57,.42)] focus-visible:outline-offset-2" type="button">
      <img className="w-[clamp(40px,3.3vw,47px)] h-[clamp(40px,3.3vw,47px)] object-contain transition-[filter] duration-150 hover:brightness-[1.06] hover:drop-shadow-[0_4px_8px_rgba(104,15,34,.18)]" src={profileIcon} alt="" />
      <span>{user?.role || 'Administrador'}</span>
      <b className="text-lg ml-1.5">⌄</b>
    </button>
  </header>;
}
