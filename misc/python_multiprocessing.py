import time
from multiprocessing import Process, Queue


def produce(q: "Queue[int]", length: int) -> None:
    for _ in range(length):
        q.put(3)

    q.put(-1)  # stop-value


def consume(q: "Queue[int]") -> None:
    while True:
        num = q.get()
        if num < 0:  # sentinel value
            break

        print(f"Sleeping for {num} seconds.")
        time.sleep(num)  # expensive work


def main() -> None:
    q: "Queue[int]" = Queue()

    for _ in range(2):
        c = Process(target=consume, args=(q,))
        c.start()

    for _ in range(2):
        p = Process(target=produce, args=(q, 5))
        p.start()

    for _ in range(2):
        p.join()

    for _ in range(2):
        c.join()


if __name__ == "__main__":
    main()
