import { Link } from 'react-router';
import { getLabMemberProfileIdByName } from '../../data/labMemberProfileLookup';

interface LabMemberNameLinkProps {
  name: string;
  userId?: string;
  className?: string;
}

export default function LabMemberNameLink({ name, userId, className }: LabMemberNameLinkProps) {
  // If we have a real ID from the backend, use it directly.
  // Otherwise, fallback to the name-based mock lookup.
  const profileId = userId ?? getLabMemberProfileIdByName(name);

  if (!profileId) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      to={`/coordinator/members/${profileId}`}
      className={className ?? 'text-blue-600 hover:text-blue-700 hover:underline'}
    >
      {name}
    </Link>
  );
}
