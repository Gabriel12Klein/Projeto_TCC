import dividerSmall from '../../../assets/admin/common/divider-small.png';
import AdminAccountMenu from './AdminAccountMenu';
import type { ResourceKey, User } from '../../../types';

export default function AdminHeader({ heading, user, onUserUpdate, onOpenModule }: { heading: string; user: User; onUserUpdate: (user: User) => void; onOpenModule: (module: ResourceKey) => void }) {
  return <header className="min-h-[clamp(125px,15vh,165px)] flex max-sm:flex-wrap items-start justify-between gap-6 pt-[clamp(8px,1vh,12px)] pr-[clamp(6px,1vw,14px)] pb-0 pl-[clamp(8px,1.1vw,18px)] shrink-0 max-[1450px]:min-h-[135px]">
    <div className="min-w-0">
      <h1 className="m-0 font-playfair text-[clamp(43px,3.7vw,56px)] leading-none text-vinum-burgundy font-semibold tracking-[.02em] max-[1450px]:text-[46px]">Admin</h1>
      <p className="mt-[7px] mx-0 mb-0.5 text-[#b17735] text-[clamp(16px,1.25vw,19px)] font-medium">{heading}</p>
      <img className="block w-[clamp(220px,17vw,265px)] h-auto mt-2 object-contain object-left pointer-events-none select-none" src={dividerSmall} alt="" aria-hidden="true" />
    </div>
    <AdminAccountMenu user={user} onUserUpdate={onUserUpdate} onOpenModule={onOpenModule} />
  </header>;
}
