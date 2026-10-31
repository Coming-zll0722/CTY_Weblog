"""Synthetic TCP loopback lesson; no external services or third-party packages."""

import json
import socket
import threading


class Decoder:
    """Two-byte big-endian payload length followed by at most 4096 bytes."""

    def __init__(self):
        self.buffer = bytearray()

    def feed(self, chunk):
        self.buffer.extend(chunk)
        frames = []
        while len(self.buffer) >= 2:
            size = int.from_bytes(self.buffer[:2], "big")
            if size > 4096:
                raise ValueError("frame exceeds the teaching protocol limit")
            if len(self.buffer) < size + 2:
                break
            frames.append(bytes(self.buffer[2:size + 2]))
            del self.buffer[:size + 2]
        return frames


def encode(payload):
    if len(payload) > 4096:
        raise ValueError("payload too large")
    return len(payload).to_bytes(2, "big") + payload


def run_case(name, chunks, expected_status, expected_frames):
    stop = threading.Event()
    server_errors = []
    evidence = []
    received = []
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen(1)
        listener.settimeout(3)

        def serve():
            try:
                with listener.accept()[0] as connection:
                    connection.settimeout(3)
                    request = Decoder()
                    while True:
                        data = connection.recv(1024)
                        if not data:
                            raise EOFError("client closed before sending its request")
                        frames = request.feed(data)
                        if frames:
                            if frames != [b"PING"]:
                                raise ValueError("unexpected synthetic request")
                            break
                    if chunks is None:
                        stop.wait(3)  # Intentionally silent until the client times out.
                    else:
                        for chunk in chunks:
                            connection.sendall(chunk)
            except (OSError, ValueError, EOFError) as error:
                server_errors.append(type(error).__name__)

        worker = threading.Thread(target=serve, daemon=True)
        worker.start()
        decoder = Decoder()
        status = "complete"
        try:
            with socket.create_connection(listener.getsockname(), timeout=3) as client:
                client.settimeout(0.5)
                client.sendall(encode(b"PING"))
                while True:
                    try:
                        data = client.recv(1024)
                    except TimeoutError:
                        status = "timeout"
                        break
                    if not data:
                        status = "truncated" if decoder.buffer else "complete"
                        break
                    frames = decoder.feed(data)
                    evidence.append({
                        "observation": len(evidence) + 1,
                        "raw_hex": data.hex(),
                        "decoded_hex": [frame.hex() for frame in frames],
                    })
                    received.extend(frames)
        finally:
            stop.set()
            worker.join(timeout=4)
        if worker.is_alive() or server_errors:
            raise RuntimeError(f"mock server failed: {server_errors}")
        if status != expected_status or received != expected_frames:
            raise AssertionError(f"{name}: unexpected status or decoded frames")
        return {
            "case": name,
            "transport": "TCP loopback",
            "status": status,
            "frames_hex": [frame.hex() for frame in received],
            "remaining_hex": decoder.buffer.hex(),
            "observations": evidence,
            "expectation_met": True,
        }


def main():
    wire = encode(b"PONG") + encode(b"ACK")
    # Socket send boundaries need not match recv boundaries. Test every possible
    # two-chunk partition directly before exercising the real loopback transport.
    for split in range(len(wire) + 1):
        decoder = Decoder()
        assert decoder.feed(wire[:split]) + decoder.feed(wire[split:]) == [b"PONG", b"ACK"]
        assert not decoder.buffer
    try:
        Decoder().feed(b"\xff\xff")
    except ValueError:
        pass
    else:
        raise AssertionError("oversized frame was accepted")
    results = [
        run_case("normal", [wire[:1], wire[1:4], wire[4:]], "complete", [b"PONG", b"ACK"]),
        run_case("truncated", [encode(b"PONG")[:-1]], "truncated", []),
        run_case("silent", None, "timeout", []),
    ]
    print(json.dumps({
        "scope": "synthetic local TCP lesson; not production or hardware validation",
        "partition_checks": len(wire) + 1,
        "oversized_frame_rejected": True,
        "cases": results,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
