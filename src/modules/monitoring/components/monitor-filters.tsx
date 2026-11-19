import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TimeRangeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Last 1h</SelectItem>
        <SelectItem value="6">Last 6h</SelectItem>
        <SelectItem value="24">Last 24h</SelectItem>
        <SelectItem value="168">Last 7d</SelectItem>
        <SelectItem value="720">Last 30d</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function EnvironmentSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder="Environment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="production">Production</SelectItem>
        <SelectItem value="staging">Staging</SelectItem>
        <SelectItem value="development">Development</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ServiceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder="Service" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All services</SelectItem>
        <SelectItem value="api">API</SelectItem>
        <SelectItem value="worker">Worker</SelectItem>
        <SelectItem value="voice">Voice</SelectItem>
        <SelectItem value="frontend">Frontend</SelectItem>
        <SelectItem value="postgres">Postgres</SelectItem>
        <SelectItem value="redis">Redis</SelectItem>
        <SelectItem value="qdrant">Qdrant</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-[220px]"
    />
  );
}
