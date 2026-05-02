import { Button } from "@/components/common";
import { useRouter } from "next/navigation";

const FindIdView = ({ loginId, error, onBack }: { loginId?: string | null, error?: string | null, onBack: () => void }) => {
    const router = useRouter();

    const handleMove = (value: string) => {
        router.push(`/${value}`); // URL 해시 변경
    };

    return (
        <>
        <div className="is-rounded-form w-full max-w-[360px] p-6 text-center bg-white">
            {error ? (
                <p>{error}</p>
            ) : (
                <>
                <p>▼ 당신의 아이디는 ▼</p>
                <p className="font-extrabold text-lg my-4">{loginId}</p>
                </>
            )}
        </div>
        <div className="text-[#4A3F2F] text-center mt-8 font-galmuri11-bold">
            <p className="text-lg">지금부터</p>
            <p className="text-lg">할일 사냥을 떠나볼까요?</p>
        </div>
        <div className="w-full max-w-[360px] mt-6">
            {!error && (
                <Button className="w-full max-w-none" state="primary" size="L" onClick={() => handleMove('signin')}>로그인하기</Button>
            )}
            {error && (
                <Button className="w-full max-w-none" state="primary" size="L" onClick={onBack}>다시 찾기</Button>
            )}
        </div>
        </>
    );
}

export default FindIdView;